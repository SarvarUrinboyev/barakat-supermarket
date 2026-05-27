package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    /** How many units of this line have been returned via refund. */
    @Column(name = "refunded_qty", nullable = false)
    private int refundedQty = 0;
}
