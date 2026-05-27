package uz.barakat.market.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.PromoCampaign;
import uz.barakat.market.domain.PromoKind;
import uz.barakat.market.repository.PromoCampaignRepository;

/**
 * Walks active {@link PromoCampaign}s at POS checkout and picks the
 * single best discount for the current cart.
 *
 * <p>Campaigns never stack — if two qualify, the one that gives a
 * bigger absolute UZS discount wins. This keeps receipts unambiguous
 * and the math predictable for the cashier.
 */
@Service
@Transactional(readOnly = true)
public class PromoService {

    private final PromoCampaignRepository promos;

    public PromoService(PromoCampaignRepository promos) {
        this.promos = promos;
    }

    /** Lightweight per-line view of the cart used by {@link #findBest}. */
    public record CartLine(Long productId, Long categoryId, int quantity,
                           BigDecimal unitPriceUzs) { }

    public record PromoMatch(
            PromoCampaign campaign,
            /** UZS amount that will come off the cart. */
            BigDecimal discountUzs,
            /** Human-readable line for the receipt. */
            String reason) { }

    /**
     * Returns the best matching promo for the cart, or null when nothing
     * qualifies. Caller applies {@link PromoMatch#discountUzs()} as the
     * sale-wide flat discount.
     */
    public PromoMatch findBest(List<CartLine> cart) {
        if (cart == null || cart.isEmpty()) return null;
        LocalDateTime now = LocalDateTime.now();
        int weekdayBit = 1 << (now.getDayOfWeek().getValue() - 1); // Mon=1 -> bit 0

        BigDecimal subtotal = cart.stream()
                .map(l -> l.unitPriceUzs().multiply(BigDecimal.valueOf(l.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PromoMatch best = null;
        for (PromoCampaign p : promos.findActiveAt(now)) {
            if ((p.getWeekdayMask() & weekdayBit) == 0) continue;
            PromoMatch match = evaluate(p, cart, subtotal);
            if (match != null && (best == null
                    || match.discountUzs().compareTo(best.discountUzs()) > 0)) {
                best = match;
            }
        }
        return best;
    }

    private PromoMatch evaluate(PromoCampaign p, List<CartLine> cart, BigDecimal subtotal) {
        // Filter the cart by the campaign's product / category scope.
        BigDecimal scopedSubtotal = scopeSubtotal(p, cart);
        if (scopedSubtotal.signum() <= 0) return null;

        return switch (p.getKind()) {
            case PERCENT_OFF -> {
                if (scopedSubtotal.compareTo(p.getMinSubtotalUzs()) < 0) yield null;
                BigDecimal discount = scopedSubtotal
                        .multiply(p.getValuePercent())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                yield new PromoMatch(p, discount,
                        String.format("%s (-%s%%)", p.getName(),
                                p.getValuePercent().stripTrailingZeros().toPlainString()));
            }
            case AMOUNT_OFF -> {
                if (scopedSubtotal.compareTo(p.getMinSubtotalUzs()) < 0) yield null;
                // Never refund more than the scoped subtotal.
                BigDecimal discount = p.getValueAmount().min(scopedSubtotal);
                yield new PromoMatch(p, discount,
                        String.format("%s (-%s UZS)", p.getName(),
                                discount.stripTrailingZeros().toPlainString()));
            }
            case BOGO -> {
                if (p.getProductId() == null || p.getBuyQty() == null
                        || p.getGetQty() == null) yield null;
                int qty = cart.stream()
                        .filter(l -> p.getProductId().equals(l.productId()))
                        .mapToInt(CartLine::quantity).sum();
                if (qty < p.getBuyQty()) yield null;
                int freeUnits = (qty / p.getBuyQty()) * p.getGetQty();
                BigDecimal unit = cart.stream()
                        .filter(l -> p.getProductId().equals(l.productId()))
                        .map(CartLine::unitPriceUzs)
                        .findFirst().orElse(BigDecimal.ZERO);
                BigDecimal discount = unit.multiply(BigDecimal.valueOf(freeUnits));
                yield new PromoMatch(p, discount,
                        String.format("%s (%d olib %d bepul × %d)", p.getName(),
                                p.getBuyQty(), p.getGetQty(), freeUnits));
            }
        };
    }

    /** Sum of cart lines that fall in the campaign's product/category scope. */
    private static BigDecimal scopeSubtotal(PromoCampaign p, List<CartLine> cart) {
        return cart.stream()
                .filter(l -> p.getProductId() == null
                        || p.getProductId().equals(l.productId()))
                .filter(l -> p.getCategoryId() == null
                        || p.getCategoryId().equals(l.categoryId()))
                .map(l -> l.unitPriceUzs().multiply(BigDecimal.valueOf(l.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
