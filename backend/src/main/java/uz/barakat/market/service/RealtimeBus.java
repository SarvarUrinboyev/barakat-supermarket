package uz.barakat.market.service;

import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Type-safe wrapper around the STOMP broker. Services call these methods
 * after committing a transaction so a single subscriber receives the new
 * row at the same time the DB sees it.
 *
 * <p>Events are published to <strong>per-shop</strong> destinations
 * ({@code /topic/shops/{shopId}/...}) so a merchant only ever receives its
 * own live feed — {@code WebSocketAuthInterceptor} additionally enforces
 * that a client can only subscribe to shops in its account. Events with a
 * null shopId (system-wide) fall back to the un-scoped {@code /topic/...}.
 *
 * <p>Payloads are intentionally tiny — clients still hit the REST API for
 * the full record. The event is a "go re-fetch / show toast" trigger, not a
 * replacement for the API.
 */
@Service
public class RealtimeBus {

    private final SimpMessagingTemplate broker;

    public RealtimeBus(SimpMessagingTemplate broker) {
        this.broker = broker;
    }

    public record SaleEvent(
            String type,
            Long saleId,
            BigDecimal totalUzs,
            String paymentMethod,
            Long shopId,
            Instant at) { }

    public record StockEvent(
            String type,
            Long productId,
            String productName,
            int delta,
            int newQuantity,
            String reason,
            Long shopId,
            Instant at) { }

    public record AlertEvent(
            String type,
            String severity,
            String message,
            Long shopId,
            Instant at) { }

    public void publishSale(Long saleId, BigDecimal total, String method, Long shopId) {
        broker.convertAndSend(topic(shopId, "sales"),
                new SaleEvent("sale.created", saleId, total, method, shopId, Instant.now()));
    }

    public void publishStock(Long productId, String productName, int delta,
                             int newQty, String reason, Long shopId) {
        broker.convertAndSend(topic(shopId, "stock"),
                new StockEvent("stock.changed", productId, productName,
                        delta, newQty, reason, shopId, Instant.now()));
    }

    public void publishAlert(String severity, String message, Long shopId) {
        broker.convertAndSend(topic(shopId, "alerts"),
                new AlertEvent("alert", severity, message, shopId, Instant.now()));
    }

    /**
     * Per-shop topic, e.g. {@code /topic/shops/7/sales}. A null shopId
     * (system-wide event) falls back to the un-scoped {@code /topic/sales}.
     */
    private static String topic(Long shopId, String suffix) {
        return shopId == null
                ? "/topic/" + suffix
                : "/topic/shops/" + shopId + "/" + suffix;
    }
}
