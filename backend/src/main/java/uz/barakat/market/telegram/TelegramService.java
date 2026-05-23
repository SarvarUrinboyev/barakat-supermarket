package uz.barakat.market.telegram;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Sends plain-text messages through the Telegram Bot API.
 *
 * <p>When the bot is not configured the calls become harmless no-ops, so
 * the rest of the system never has to care whether Telegram is set up.
 */
@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);
    private static final String API = "https://api.telegram.org/bot";

    private final TelegramProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public TelegramService(TelegramProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return properties.isUsable();
    }

    /** Sends {@code text} to every configured chat; failures are logged, never thrown. */
    public void sendMessage(String text) {
        if (!properties.isUsable()) {
            log.info("Telegram is not configured - message skipped");
            return;
        }
        for (String chatId : properties.chatIds()) {
            sendToChat(chatId.trim(), text);
        }
    }

    private void sendToChat(String chatId, String text) {
        try {
            String payload = objectMapper.writeValueAsString(
                    Map.of("chat_id", chatId, "text", text, "disable_web_page_preview", true));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API + properties.botToken() + "/sendMessage"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 == 2) {
                log.info("Telegram message delivered to chat {}", chatId);
            } else {
                log.warn("Telegram delivery to chat {} failed: HTTP {} - {}",
                        chatId, response.statusCode(), response.body());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Telegram delivery to chat {} was interrupted", chatId);
        } catch (Exception ex) {
            log.warn("Telegram delivery to chat {} failed: {}", chatId, ex.toString());
        }
    }
}
