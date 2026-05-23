package uz.barakat.market.dto;

import java.math.BigDecimal;

/** A single bar in the dashboard "top expenses" panel. */
public record ExpenseSlice(
        String name,
        BigDecimal amount,
        int percent) {
}
