package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** The morning cash the owner brought in for a given date. */
@Entity
@Table(name = "day_balance")
@Getter
@Setter
public class DayBalance extends BaseEntity {

    @Column(name = "date", nullable = false, unique = true)
    private LocalDate date;

    @Column(name = "starting_cash", nullable = false, precision = 15, scale = 2)
    private BigDecimal startingCash = BigDecimal.ZERO;
}
