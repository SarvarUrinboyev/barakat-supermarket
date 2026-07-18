package uz.barakat.market.service.savdograph.copilot;

import java.util.regex.Pattern;

/** Minimal provider-bound text sanitization; raw questions are never audited. */
public final class StoreCopilotPrivacy {

    private static final Pattern EMAIL = Pattern.compile(
            "(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b");
    private static final Pattern PHONE = Pattern.compile(
            "(?<!\\w)(?:\\+?[0-9][0-9 ()-]{7,}[0-9])(?!\\w)");
    private static final Pattern SENSITIVE_LABEL = Pattern.compile(
            "(?iu)\\b(?:customer|employee|supplier|client|staff|full[ -]?name|address|"
                    + "mijoz|xodim|yetkazib beruvchi|ism|manzil|"
                    + "клиент|сотрудник|поставщик|имя|адрес)"
                    + "\\s*(?:name|contact|phone|email|nomi|ismi|telefon|pochta|"
                    + "имя|контакт|телефон|почта)?\\s*[:=]\\s*[^,;\\r\\n]{2,160}");
    private static final Pattern CREDENTIAL = Pattern.compile(
            "(?iu)\\b(?:api[_ -]?key|access[_ -]?token|password|secret|parol|token)\\s*[:=]\\s*\\S+");
    private static final Pattern LONG_IDENTIFIER = Pattern.compile("(?<!\\d)\\d{12,}(?!\\d)");
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}&&[^\\r\\n\\t]]");

    private StoreCopilotPrivacy() {
    }

    public static String sanitizeQuestion(String question) {
        String normalized = CONTROL.matcher(question == null ? "" : question.trim()).replaceAll(" ");
        normalized = SENSITIVE_LABEL.matcher(normalized).replaceAll("[redacted-personal-data]");
        normalized = CREDENTIAL.matcher(normalized).replaceAll("[redacted-credential]");
        normalized = EMAIL.matcher(normalized).replaceAll("[redacted-email]");
        normalized = LONG_IDENTIFIER.matcher(normalized).replaceAll("[redacted-identifier]");
        normalized = PHONE.matcher(normalized).replaceAll("[redacted-phone]");
        return normalized;
    }

    public static String sanitizeDisplayName(String displayName) {
        String safe = sanitizeQuestion(displayName).replaceAll("[\\r\\n\\t]+", " ").strip();
        return safe.length() <= 160 ? safe : safe.substring(0, 160);
    }
}
