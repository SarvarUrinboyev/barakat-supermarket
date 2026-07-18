package uz.barakat.market.service.savdograph.copilot;

/** Safe, typed provider failure. Provider bodies and credentials are never exposed. */
public class StoreCopilotProviderException extends RuntimeException {

    public enum Kind {
        UNAVAILABLE,
        TIMEOUT,
        RATE_LIMIT,
        NETWORK,
        INCOMPLETE,
        INVALID_RESPONSE
    }

    private final Kind kind;

    public StoreCopilotProviderException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public StoreCopilotProviderException(Kind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
    }

    public Kind kind() {
        return kind;
    }
}
