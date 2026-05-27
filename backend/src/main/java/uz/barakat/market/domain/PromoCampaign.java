package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

/**
 * One marketing campaign — a time-bounded, kind-typed discount that
 * the POS auto-applies to qualifying carts.
 *
 * <p>Three kinds are supported today (see {@link PromoKind}); the
 * service layer walks active campaigns at checkout and picks the
 * single best one for the cart. Campaigns never stack.
 */
@Filter(name = "tenantFilter", condition = "shop_id = :shopId")
@Filter(name = "accountFilter", condition = "shop_id IN (:shopIds)")
@Entity
@Table(name = "promo_campaigns")
@Getter
@Setter
public class PromoCampaign extends TenantScopedEntity {

    @Column(nullable = false, length = 180)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PromoKind kind;

    @Column(name = "value_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal valuePercent = BigDecimal.ZERO;

    @Column(name = "value_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal valueAmount = BigDecimal.ZERO;

    @Column(name = "min_subtotal_uzs", nullable = false, precision = 15, scale = 2)
    private BigDecimal minSubtotalUzs = BigDecimal.ZERO;

    @Column(name = "buy_qty")
    private Integer buyQty;

    @Column(name = "get_qty")
    private Integer getQty;

    /** When set, the promo applies only to a single product. */
    @Column(name = "product_id")
    private Long productId;

    /** When set (and productId is null), the promo applies to a whole category. */
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    private LocalDateTime endsAt;

    @Column(nullable = false)
    private boolean active = true;

    /** Bitmask: bit 0 = Monday … bit 6 = Sunday. Default 127 = every day. */
    @Column(name = "weekday_mask", nullable = false)
    private int weekdayMask = 127;

    @Column(length = 500)
    private String description;
}
