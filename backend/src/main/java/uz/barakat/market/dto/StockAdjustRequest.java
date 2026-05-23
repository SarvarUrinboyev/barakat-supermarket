package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import uz.barakat.market.domain.StockReason;

/** Stock movement: a positive delta is Kirim, a negative delta is Chiqim. */
public record StockAdjustRequest(
        @NotNull(message = "Miqdor kiritilishi shart") Integer delta,
        @NotNull(message = "Sabab tanlanishi shart") StockReason reason,
        String note) {
}
