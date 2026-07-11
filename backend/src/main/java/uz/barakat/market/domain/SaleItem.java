package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** One line on a POS sale receipt: which product, qty, price and discount. */
@Entity
@Table(name = "sale_items")
@Getter
@Setter
public class SaleItem extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    /** Set to NULL when the product is later deleted — the snapshot below
     *  keeps the receipt readable. */
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "product_sku", length = 80)
    private String productSku;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price_uzs", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPriceUzs = BigDecimal.ZERO;

    @Column(name = "line_discount_uzs", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineDiscountUzs = BigDecimal.ZERO;

    @Column(name = "line_total_uzs", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineTotalUzs = BigDecimal.ZERO;

    /**
     * Cost price per unit frozen at sale time ("tannarx"). Drives COGS so the
     * profit of a past sale never changes when the product's cost is edited
     * later. Null on legacy rows that predate the snapshot (V37); the posting
     * and reporting code falls back to the product's current cost for those.
     */
    @Column(name = "cost_at_sale_uzs", precision = 15, scale = 2)
    private BigDecimal costAtSaleUzs;

    /** How many units of this line have been returned via refund. */
    @Column(name = "refunded_qty", nullable = false)
    private int refundedQty = 0;

    /**
     * Native currency this line was sold in (the product's currency at sell
     * time). Legacy rows backfilled from the product's population currency.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private Currency currency = Currency.UZS;

    /**
     * USD→UZS rate used to fold this line into the so'm-canonical sale total,
     * pinned per line. Null for UZS lines and legacy rows. Enables receipt
     * annotation "$1 350 @ 12 650" and correct later profit math.
     */
    @Column(name = "usd_rate_at_sale", precision = 12, scale = 2)
    private BigDecimal usdRateAtSale;
}
