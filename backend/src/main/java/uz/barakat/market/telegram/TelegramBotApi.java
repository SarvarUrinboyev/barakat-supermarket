package uz.barakat.market.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Thin Telegram Bot API client for the customer self-service bot:
 * long-poll for updates, send messages (with optional keyboards) and
 * acknowledge callback queries. Every failure is logged, never thrown.
 */
@Component
public class TelegramBotApi {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotApi.class);
    private static final String API = "https://api.telegram.org/bot";

    private final CustomerBotProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public TelegramBotApi(CustomerBotProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /**
     * Long-polls for updates. Returns the {@code result} array node, or
     * {@code null} on any failure.
     */
    public JsonNode getUpdates(long offset, int timeoutSeconds) {
        try {
            String url = API + properties.token() + "/getUpdates?offset=" + offset
                    + "&timeout=" + timeoutSeconds;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(timeoutSeconds + 15L))
                    .GET()
                    .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Telegram getUpdates failed: HTTP {}", response.statusCode());
                return null;
            }
            return objectMapper.readTree(response.body()).path("result");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception ex) {
            log.warn("Telegram getUpdates error: {}", ex.toString());
            return null;
        }
    }

    public void sendMessage(long chatId, String text) {
        sendMessage(chatId, text, null);
    }

    /** Sends a message; {@code replyMarkup} may be null or a keyboard structure. */
    public void sendMessage(long chatId, String text, Object replyMarkup) {
        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", text);
        body.put("disable_web_page_preview", true);
        if (replyMarkup != null) {
            body.put("reply_markup", replyMarkup);
        }
        post("sendMessage", body);
    }

    public void answerCallback(String callbackQueryId) {
        post("answerCallbackQuery", Map.of("callback_query_id", callbackQueryId));
    }

    private void post(String method, Map<String, Object> body) {
        try {
            String payload = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API + properties.token() + "/" + method))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Telegram {} failed: HTTP {} - {}",
                        method, response.statusCode(), response.body());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (Exception ex) {
            log.warn("Telegram {} error: {}", method, ex.toString());
        }
    }
}
