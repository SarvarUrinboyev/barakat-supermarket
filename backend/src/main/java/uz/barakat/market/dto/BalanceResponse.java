package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** The morning cash balance for a date. */
public record BalanceResponse(
        LocalDate date,
        BigDecimal startingCash) {
}
