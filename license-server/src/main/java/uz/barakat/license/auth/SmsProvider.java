package uz.barakat.license.auth;

/**
 * Pluggable transport for outbound SMS. The default implementation
 * ({@link LoggingSmsProvider}) just writes to the server log — handy for
 * local dev and for tests. Production deploys swap in a real gateway
 * (Eskiz.uz, Playmobile) by registering a different Spring bean.
 */
public interface SmsProvider {

    /**
     * Send {@code body} to {@code phone}. Failures are returned as
     * {@code false} so the caller can decide whether to retry or give up;
     * exceptions are reserved for misconfiguration / programming errors.
     */
    boolean send(String phone, String body);
}
