package uz.barakat.market.service.savdograph.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ProviderRequest;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ProviderTurn;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ToolCall;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProviderException.Kind;

/**
 * Stateless OpenAI Responses API adapter. Tool continuation items are carried by
 * the server, {@code store=false} is explicit, and neither request bodies nor
 * credentials are logged or persisted.
 */
@Service
public class OpenAiResponsesStoreCopilotProvider implements StoreCopilotProvider {

    static final URI RESPONSES_URI = URI.create("https://api.openai.com/v1/responses");
    private static final Set<String> ALLOWED_MODELS = Set.of("gpt-5.6-terra", "gpt-5.6-sol");
    private static final Set<String> ALLOWED_REASONING = Set.of(
            "none", "minimal", "low", "medium", "high", "xhigh", "max");

    private final ObjectMapper mapper;
    private final String apiKey;
    private final String model;
    private final String reasoningEffort;
    private final int maxOutputTokens;
    private final Duration timeout;
    private final Transport transport;

    @org.springframework.beans.factory.annotation.Autowired
    public OpenAiResponsesStoreCopilotProvider(
            ObjectMapper mapper,
            @Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${OPENAI_MODEL:gpt-5.6-terra}") String model,
            @Value("${OPENAI_REASONING_EFFORT:medium}") String reasoningEffort,
            @Value("${OPENAI_MAX_OUTPUT_TOKENS:1200}") int maxOutputTokens,
            @Value("${OPENAI_TIMEOUT_SECONDS:30}") int timeoutSeconds) {
        this(mapper, apiKey, model, reasoningEffort, maxOutputTokens, timeoutSeconds,
                new JavaHttpTransport());
    }

    OpenAiResponsesStoreCopilotProvider(ObjectMapper mapper, String apiKey, String model,
                                        String reasoningEffort, int maxOutputTokens, int timeoutSeconds,
                                        Transport transport) {
        this.mapper = mapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = ALLOWED_MODELS.contains(model) ? model : "gpt-5.6-terra";
        this.reasoningEffort = ALLOWED_REASONING.contains(reasoningEffort) ? reasoningEffort : "medium";
        this.maxOutputTokens = Math.max(256, Math.min(maxOutputTokens, 4000));
        this.timeout = Duration.ofSeconds(Math.max(1, Math.min(timeoutSeconds, 120)));
        this.transport = transport;
    }

    @Override
    public boolean isAvailable() {
        return !apiKey.isBlank();
    }

    @Override
    public String model() {
        return model;
    }

    @Override
    public ProviderTurn exchange(ProviderRequest request) {
        if (!isAvailable()) {
            throw new StoreCopilotProviderException(Kind.UNAVAILABLE,
                    "OpenAI provider is not configured");
        }
        String body = requestJson(request);
        long started = System.nanoTime();
        TransportResponse response = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                response = transport.post(new TransportRequest(RESPONSES_URI, timeout, apiKey, body));
                if (response.statusCode() == 429) {
                    if (attempt == 0) {
                        continue;
                    }
                    throw new StoreCopilotProviderException(Kind.RATE_LIMIT,
                            "OpenAI provider rate limit reached");
                }
                if (response.statusCode() >= 500) {
                    if (attempt == 0) {
                        continue;
                    }
                    throw new StoreCopilotProviderException(Kind.NETWORK,
                            "OpenAI provider server error");
                }
                if (response.statusCode() == 401 || response.statusCode() == 403) {
                    throw new StoreCopilotProviderException(Kind.UNAVAILABLE,
                            "OpenAI provider credentials are unavailable");
                }
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    throw new StoreCopilotProviderException(Kind.INVALID_RESPONSE,
                            "OpenAI provider rejected the request");
                }
                break;
            } catch (HttpTimeoutException ex) {
                if (attempt == 0) {
                    continue;
                }
                throw new StoreCopilotProviderException(Kind.TIMEOUT, "OpenAI provider timed out", ex);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new StoreCopilotProviderException(Kind.NETWORK, "Provider request interrupted", ex);
            } catch (IOException ex) {
                if (attempt == 0) {
                    continue;
                }
                throw new StoreCopilotProviderException(Kind.NETWORK, "OpenAI provider network error", ex);
            }
        }
        if (response == null) {
            throw new StoreCopilotProviderException(Kind.NETWORK, "OpenAI provider did not respond");
        }
        long latencyMs = Duration.ofNanos(System.nanoTime() - started).toMillis();
        return parse(response.body(), latencyMs);
    }

    private String requestJson(ProviderRequest request) {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.put("instructions", request.instructions());
        body.set("input", request.input());
        body.set("tools", request.tools());
        body.put("parallel_tool_calls", false);
        body.putObject("reasoning").put("effort", reasoningEffort);
        body.put("max_output_tokens", maxOutputTokens);
        body.put("safety_identifier", request.safetyIdentifier());
        body.put("store", false);
        body.putObject("text").set("format", request.responseFormat());
        try {
            return mapper.writeValueAsString(body);
        } catch (JsonProcessingException ex) {
            throw new StoreCopilotProviderException(Kind.INVALID_RESPONSE,
                    "Provider request could not be serialized", ex);
        }
    }

    private ProviderTurn parse(String responseBody, long latencyMs) {
        try {
            JsonNode root = mapper.readTree(responseBody);
            if (!"completed".equals(root.path("status").asText())) {
                throw new StoreCopilotProviderException(Kind.INCOMPLETE,
                        "OpenAI provider response was incomplete");
            }
            JsonNode output = root.path("output");
            if (!output.isArray()) {
                throw new StoreCopilotProviderException(Kind.INVALID_RESPONSE,
                        "OpenAI provider output is missing");
            }
            List<ToolCall> calls = new ArrayList<>();
            JsonNode structured = null;
            boolean refused = false;
            for (JsonNode item : output) {
                if ("function_call".equals(item.path("type").asText())) {
                    JsonNode arguments = parseArguments(item.get("arguments"));
                    calls.add(new ToolCall(requiredText(item, "call_id"), requiredText(item, "name"), arguments));
                } else if ("message".equals(item.path("type").asText())) {
                    for (JsonNode content : item.path("content")) {
                        String type = content.path("type").asText();
                        if ("refusal".equals(type)) {
                            refused = true;
                        } else if ("output_text".equals(type)) {
                            structured = mapper.readTree(requiredText(content, "text"));
                        }
                    }
                }
            }
            if (!refused && calls.isEmpty() && (structured == null || !structured.isObject())) {
                throw new StoreCopilotProviderException(Kind.INVALID_RESPONSE,
                        "OpenAI structured output is missing or invalid");
            }
            return new ProviderTurn(root.path("id").asText(""), root.path("model").asText(model),
                    List.copyOf(calls), structured, output.deepCopy(), refused, latencyMs);
        } catch (StoreCopilotProviderException ex) {
            throw ex;
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new StoreCopilotProviderException(Kind.INVALID_RESPONSE,
                    "OpenAI provider returned invalid structured data", ex);
        }
    }

    private JsonNode parseArguments(JsonNode arguments) throws JsonProcessingException {
        if (arguments == null) {
            throw new IllegalArgumentException("Function arguments are missing");
        }
        return arguments.isTextual() ? mapper.readTree(arguments.asText()) : arguments;
    }

    private static String requiredText(JsonNode node, String field) {
        String value = node.path(field).asText("");
        if (value.isBlank()) {
            throw new IllegalArgumentException("Required provider field is missing");
        }
        return value;
    }

    interface Transport {
        TransportResponse post(TransportRequest request) throws IOException, InterruptedException;
    }

    record TransportRequest(URI uri, Duration timeout, String apiKey, String jsonBody) {
    }

    record TransportResponse(int statusCode, String body) {
    }

    private static final class JavaHttpTransport implements Transport {
        private final HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();

        @Override
        public TransportResponse post(TransportRequest request) throws IOException, InterruptedException {
            HttpRequest httpRequest = HttpRequest.newBuilder(request.uri())
                    .timeout(request.timeout())
                    .header("Authorization", "Bearer " + request.apiKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(request.jsonBody()))
                    .build();
            HttpResponse<String> response = client.send(httpRequest,
                    HttpResponse.BodyHandlers.ofString());
            return new TransportResponse(response.statusCode(), response.body());
        }
    }
}
