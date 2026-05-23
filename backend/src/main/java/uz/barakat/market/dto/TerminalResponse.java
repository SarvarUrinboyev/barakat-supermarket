package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** API view of the daily terminal totals, including the sum. */
public record TerminalResponse(
        LocalDate date,
        BigDecimal humoAmount,
        BigDecimal uzcardAmount,
        BigDecimal total) {
}
