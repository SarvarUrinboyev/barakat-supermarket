package uz.barakat.market.service.savdograph.copilot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.io.IOException;
import java.net.http.HttpTimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import uz.barakat.market.service.savdograph.copilot.OpenAiResponsesStoreCopilotProvider.TransportRequest;
import uz.barakat.market.service.savdograph.copilot.OpenAiResponsesStoreCopilotProvider.TransportResponse;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ProviderRequest;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProviderException.Kind;

class OpenAiResponsesStoreCopilotProviderTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void requestUsesConfiguredGpt56ModelServerKeyStrictSchemasAndNoPersistence() throws Exception {
        AtomicReference<TransportRequest> captured = new AtomicReference<>();
        var provider = provider("server-only-secret", "gpt-5.6-sol", request -> {
            captured.set(request);
            return new TransportResponse(200, completed(validResult("en")));
        });

        var turn = provider.exchange(request());

        JsonNode body = mapper.readTree(captured.get().jsonBody());
        assertThat(body.path("model").asText()).isEqualTo("gpt-5.6-sol");
        assertThat(body.path("reasoning").path("effort").asText()).isEqualTo("medium");
        assertThat(body.path("max_output_tokens").asInt()).isEqualTo(1200);
        assertThat(body.path("parallel_tool_calls").asBoolean()).isFalse();
        assertThat(body.path("store").asBoolean()).isFalse();
        assertThat(body.has("include")).isFalse();
        assertThat(body.toString()).doesNotContain("chain-of-thought", "reasoning_summary");
        assertThat(body.path("text").path("format").path("strict").asBoolean()).isTrue();
        assertThat(body.path("tools")).allSatisfy(tool -> {
            assertThat(tool.path("strict").asBoolean()).isTrue();
            assertThat(tool.path("parameters").path("additionalProperties").asBoolean()).isFalse();
            assertThat(tool.path("parameters").path("required").size())
                    .isEqualTo(tool.path("parameters").path("properties").size());
        });
        assertThat(captured.get().apiKey()).isEqualTo("server-only-secret");
        assertThat(captured.get().jsonBody()).doesNotContain("server-only-secret");
        assertThat(turn.structuredOutput().path("status").asText()).isEqualTo("UNSUPPORTED");
    }

    @Test
    void defaultsAndAllowListPreventUnreviewedModelOrReasoningConfiguration() {
        var provider = new OpenAiResponsesStoreCopilotProvider(mapper, "key", "unreviewed-model",
                "chain-of-thought", 99_999, 999, request -> new TransportResponse(200, completed(validResult("en"))));
        assertThat(provider.model()).isEqualTo("gpt-5.6-terra");
        provider.exchange(request());
    }

    @Test
    void absentApiKeyIsTypedUnavailableAndMakesNoTransportCall() {
        AtomicInteger calls = new AtomicInteger();
        var provider = provider("", "gpt-5.6-terra", request -> {
            calls.incrementAndGet();
            return new TransportResponse(200, "{}");
        });
        assertThat(provider.isAvailable()).isFalse();
        assertThatThrownBy(() -> provider.exchange(request()))
                .isInstanceOf(StoreCopilotProviderException.class)
                .extracting(ex -> ((StoreCopilotProviderException) ex).kind())
                .isEqualTo(Kind.UNAVAILABLE);
        assertThat(calls).hasValue(0);
    }

    @Test
    void refusalAndIncompleteResponseAreTyped() {
        var refusal = provider("key", "gpt-5.6-terra", request -> new TransportResponse(200,
                "{\"id\":\"r\",\"model\":\"gpt-5.6-terra\",\"status\":\"completed\",\"output\":["
                        + "{\"type\":\"message\",\"content\":[{\"type\":\"refusal\",\"refusal\":\"safe\"}]}]}"));
        assertThat(refusal.exchange(request()).refused()).isTrue();

        var incomplete = provider("key", "gpt-5.6-terra", request ->
                new TransportResponse(200, "{\"id\":\"r\",\"status\":\"incomplete\",\"output\":[]}"));
        assertThatThrownBy(() -> incomplete.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(Kind.INCOMPLETE));
    }

    @Test
    void timeoutAndRateLimitRetryAtMostOnceAndRemainTyped() {
        AtomicInteger timeouts = new AtomicInteger();
        var timeout = provider("key", "gpt-5.6-terra", request -> {
            timeouts.incrementAndGet();
            throw new HttpTimeoutException("test timeout");
        });
        assertThatThrownBy(() -> timeout.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(Kind.TIMEOUT));
        assertThat(timeouts).hasValue(2);

        AtomicInteger rateLimits = new AtomicInteger();
        var rateLimit = provider("key", "gpt-5.6-terra", request -> {
            rateLimits.incrementAndGet();
            return new TransportResponse(429, "ignored provider diagnostics");
        });
        assertThatThrownBy(() -> rateLimit.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(Kind.RATE_LIMIT));
        assertThat(rateLimits).hasValue(2);
    }

    @Test
    void authenticationFailureIsUnavailableWithoutRetryOrCredentialDisclosure() {
        AtomicInteger calls = new AtomicInteger();
        var provider = provider("server-only-secret", "gpt-5.6-terra", request -> {
            calls.incrementAndGet();
            return new TransportResponse(401, "diagnostic must stay private");
        });
        assertThatThrownBy(() -> provider.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class, ex -> {
                    assertThat(ex.kind()).isEqualTo(Kind.UNAVAILABLE);
                    assertThat(ex.getMessage()).doesNotContain("server-only-secret", "diagnostic");
                });
        assertThat(calls).hasValue(1);
    }

    @Test
    void networkAndServerFailuresRetryOnlyOnce() {
        AtomicInteger networkCalls = new AtomicInteger();
        var network = provider("key", "gpt-5.6-terra", request -> {
            networkCalls.incrementAndGet();
            throw new IOException("synthetic network failure");
        });
        assertThatThrownBy(() -> network.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(Kind.NETWORK));
        assertThat(networkCalls).hasValue(2);

        AtomicInteger serverCalls = new AtomicInteger();
        var server = provider("key", "gpt-5.6-terra", request -> {
            serverCalls.incrementAndGet();
            return new TransportResponse(503, "private provider diagnostic");
        });
        assertThatThrownBy(() -> server.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(Kind.NETWORK));
        assertThat(serverCalls).hasValue(2);
    }
    @Test
    void malformedStructuredTextIsRejected() {
        var provider = provider("key", "gpt-5.6-terra", request -> new TransportResponse(200,
                completed("not-json")));
        assertThatThrownBy(() -> provider.exchange(request()))
                .isInstanceOfSatisfying(StoreCopilotProviderException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(Kind.INVALID_RESPONSE));
    }

    private OpenAiResponsesStoreCopilotProvider provider(
            String key, String model, OpenAiResponsesStoreCopilotProvider.Transport transport) {
        return new OpenAiResponsesStoreCopilotProvider(mapper, key, model, "medium", 1200, 30, transport);
    }

    private ProviderRequest request() {
        return new ProviderRequest(StoreCopilotInstructions.TEXT,
                mapper.createArrayNode().add(mapper.createObjectNode().put("role", "user").put("content", "question")),
                StoreCopilotSchemas.tools(mapper), StoreCopilotSchemas.responseFormat(mapper), "savdo_test");
    }

    private String completed(String resultText) {
        try {
            ArrayNode output = mapper.createArrayNode();
            output.add(mapper.createObjectNode().put("type", "message").set("content",
                    mapper.createArrayNode().add(mapper.createObjectNode()
                            .put("type", "output_text").put("text", resultText))));
            return mapper.writeValueAsString(mapper.createObjectNode()
                    .put("id", "resp_test").put("model", "gpt-5.6-terra")
                    .put("status", "completed").set("output", output));
        } catch (Exception ex) {
            throw new AssertionError(ex);
        }
    }

    private String validResult(String language) {
        try {
            var result = mapper.createObjectNode()
                    .put("status", "UNSUPPORTED").put("language", language)
                    .put("answer", "Unsupported request.").put("classification", "UNSUPPORTED");
            result.set("facts", mapper.createArrayNode());
            result.set("assumptions", mapper.createArrayNode());
            result.set("limitations", mapper.createArrayNode());
            result.set("tools_used", mapper.createArrayNode());
            result.set("evidence_ids", mapper.createArrayNode());
            result.set("suggested_next_actions", mapper.createArrayNode());
            return mapper.writeValueAsString(result);
        } catch (Exception ex) {
            throw new AssertionError(ex);
        }
    }
}
