package uz.barakat.market.telegram;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Customer self-service Telegram bot configuration, bound from the
 * {@code telegram.customer-bot.*} keys. This is a SEPARATE bot from the
 * owner-notification bot ({@code telegram.*}).
 */
@ConfigurationProperties(prefix = "telegram.customer-bot")
public record CustomerBotProperties(boolean enabled, String token) {

    /** True only when the customer bot is enabled and a real token is set. */
    public boolean isUsable() {
        return enabled
                && token != null
                && !token.isBlank()
                && !token.startsWith("PUT-");
    }
}
