package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** "My debt": an amount the owner owes to a supplier. */
@Entity
@Table(name = "debtors")
@Getter
@Setter
public class Debtor extends BaseEntity {

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String name;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "original_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean paid = false;

    @Column(length = 500)
    private String note;
}
