package uz.barakat.market.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Customer;
import uz.barakat.market.repository.CustomerRepository;

/**
 * Points-based loyalty.
 *
 * <ul>
 *   <li>Earn: {@code 1 point per 1000 UZS spent} (configurable via
 *       {@code loyalty.earn-uzs-per-point}). Booked at POS checkout
 *       when the sale is linked to a customer.</li>
 *   <li>Redeem: {@code 1 point = 100 UZS} (configurable). Applied as
 *       a flat sale discount when the cashier types/scans a card code
 *       and the customer chooses to spend points.</li>
 *   <li>Card QR: each customer gets a UUID {@code card_code} that can
 *       be printed on a physical card and scanned at the POS.</li>
 * </ul>
 *
 * <p>The actual ledger (every earn/redeem) is appended to
 * {@code customer_transactions} via the V18 {@code points_delta} column —
 * the balance on {@code customers} is just a denormalised cache.
 */
@Service
@Transactional
public class LoyaltyService {

    private static final Logger log = LoggerFactory.getLogger(LoyaltyService.class);

    private final CustomerRepository customers;
    private final BigDecimal earnUzsPerPoint;
    private final BigDecimal redeemUzsPerPoint;

    public LoyaltyService(
            CustomerRepository customers,
            @Value("${loyalty.earn-uzs-per-point:1000}") BigDecimal earnRate,
            @Value("${loyalty.redeem-uzs-per-point:100}") BigDecimal redeemRate) {
        this.customers = customers;
        this.earnUzsPerPoint = earnRate;
        this.redeemUzsPerPoint = redeemRate;
    }

    public BigDecimal earnRate() { return earnUzsPerPoint; }
    public BigDecimal redeemRate() { return redeemUzsPerPoint; }

    /**
     * Convert a sale total into points earned. Floor-rounded so partial
     * UZS amounts don't drip points (matches the printed-receipt math).
     */
    public long pointsForSale(BigDecimal saleTotalUzs) {
        if (saleTotalUzs == null || saleTotalUzs.signum() <= 0) return 0L;
        return saleTotalUzs.divide(earnUzsPerPoint, 0, RoundingMode.FLOOR).longValueExact();
    }

    /** Convert a redeemable point count into the UZS amount it knocks off. */
    public BigDecimal redeemValueUzs(long points) {
        if (points <= 0) return BigDecimal.ZERO;
        return redeemUzsPerPoint.multiply(BigDecimal.valueOf(points))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** Find the customer behind a scanned card code. */
    public Optional<Customer> byCardCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        return customers.findByCardCode(code.trim());
    }

    /** Issue a brand-new card code (UUID) for a customer that doesn't have one. */
    public Customer ensureCardCode(Customer c) {
        if (c.getCardCode() == null || c.getCardCode().isBlank()) {
            c.setCardCode(UUID.randomUUID().toString());
            customers.save(c);
            log.info("Issued loyalty card to customer #{}: {}", c.getId(), c.getCardCode());
        }
        return c;
    }

    /** Credit a customer for a completed sale. Idempotent on retry isn't
     *  guaranteed — callers must not double-call within one transaction. */
    public void credit(Customer c, BigDecimal saleTotalUzs) {
        long earned = pointsForSale(saleTotalUzs);
        if (earned == 0) return;
        c.setPointsBalance(nz(c.getPointsBalance()) + earned);
        c.setPointsTotalEarned(nz(c.getPointsTotalEarned()) + earned);
        customers.save(c);
    }

    /** Spend points; returns the actual UZS discount taken. */
    public BigDecimal redeem(Customer c, long requestedPoints) {
        long balance = nz(c.getPointsBalance());
        long toRedeem = Math.min(balance, Math.max(0, requestedPoints));
        if (toRedeem == 0) return BigDecimal.ZERO;
        c.setPointsBalance(balance - toRedeem);
        customers.save(c);
        return redeemValueUzs(toRedeem);
    }

    private static long nz(Long v) { return v == null ? 0L : v; }
}
