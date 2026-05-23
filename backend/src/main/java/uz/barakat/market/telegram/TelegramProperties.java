package uz.barakat.market.telegram;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Telegram bot configuration, bound from the {@code telegram.*} keys.
 * Real values live in the gitignored {@code application-local.properties}.
 */
@ConfigurationProperties(prefix = "telegram")
public record TelegramProperties(
        boolean enabled,
        String botToken,
        List<String> chatIds) {

    /** True only when the bot is enabled and fully configured. */
    public boolean isUsable() {
        return enabled
                && botToken != null && !botToken.isBlank()
                && !botToken.startsWith("PUT-")
                && chatIds != null && !chatIds.isEmpty();
    }
}
