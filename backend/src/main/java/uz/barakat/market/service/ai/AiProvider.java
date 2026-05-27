package uz.barakat.market.service.ai;

/**
 * One LLM endpoint. Implementations are stateless and thread-safe so the
 * provider chain can hand them out to concurrent callers.
 *
 * <p>The {@link uz.barakat.market.service.AiChatService router} walks a
 * configured ordered list of providers and uses the first one that
 * returns successfully. A provider is "configured" when its API key is
 * non-blank; the router silently skips unconfigured slots.
 *
 * <p>{@code complete} throws on:
 *   <ul>
 *     <li>Network timeout / connection refused</li>
 *     <li>HTTP 4xx (incl. 429 rate-limit and 401 auth)</li>
 *     <li>HTTP 5xx upstream error</li>
 *     <li>Malformed response body</li>
 *   </ul>
 * The router catches all of these and falls through to the next provider.
 */
public interface AiProvider {

    /** Short, log-friendly identifier — e.g. {@code "nvidia-kimi"}. */
    String name();

    /** True when this provider has enough config to attempt a call. */
    boolean isConfigured();

    /**
     * @param system system / role-instruction prompt
     * @param user   the actual user question (with any pre-prepended context)
     * @return plain-text answer from the model
     */
    String complete(String system, String user) throws Exception;
}
