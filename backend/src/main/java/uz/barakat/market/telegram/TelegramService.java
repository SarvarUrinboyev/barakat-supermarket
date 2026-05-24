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

    /**
     * Send a binary attachment (typically a PDF report) with an optional
     * caption to every configured chat. Telegram caps documents at 50 MB
     * for bots; our generated reports are under 50 KB so we never get
     * close. Failures log + return — callers don't need to handle them.
     */
    public void sendDocument(byte[] bytes, String fileName, String caption) {
        if (!properties.isUsable()) {
            log.info("Telegram is not configured - document {} skipped", fileName);
            return;
        }
        for (String chatId : properties.chatIds()) {
            sendDocumentToChat(chatId.trim(), bytes, fileName, caption);
        }
    }

    private void sendDocumentToChat(String chatId, byte[] bytes,
                                    String fileName, String caption) {
        // multipart/form-data, hand-rolled to avoid pulling in a heavy
        // HTTP-client dependency just for this single call site.
        String boundary = "----savdopro-" + System.nanoTime();
        try {
            var baos = new java.io.ByteArrayOutputStream();
            writePart(baos, boundary, "chat_id", chatId);
            if (caption != null && !caption.isBlank()) {
                writePart(baos, boundary, "caption", caption);
            }
            writeFilePart(baos, boundary, "document", fileName,
                    "application/pdf", bytes);
            baos.write(("--" + boundary + "--\r\n")
                    .getBytes(StandardCharsets.UTF_8));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(API + properties.botToken() + "/sendDocument"))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(baos.toByteArray()))
                    .build();
            HttpResponse<String> resp = httpClient.send(req,
                    HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 == 2) {
                log.info("Telegram document {} delivered to chat {}", fileName, chatId);
            } else {
                log.warn("Telegram document delivery to chat {} failed: HTTP {} - {}",
                        chatId, resp.statusCode(), resp.body());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (Exception ex) {
            log.warn("Telegram document delivery to chat {} failed: {}",
                    chatId, ex.toString());
        }
    }

    private static void writePart(java.io.ByteArrayOutputStream out,
                                  String boundary, String name, String value)
            throws java.io.IOException {
        out.write(("--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n"
                + value + "\r\n").getBytes(StandardCharsets.UTF_8));
    }

    private static void writeFilePart(java.io.ByteArrayOutputStream out,
                                      String boundary, String name,
                                      String fileName, String contentType,
                                      byte[] bytes) throws java.io.IOException {
        out.write(("--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"" + name + "\"; "
                + "filename=\"" + fileName + "\"\r\n"
                + "Content-Type: " + contentType + "\r\n\r\n")
                .getBytes(StandardCharsets.UTF_8));
        out.write(bytes);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
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
