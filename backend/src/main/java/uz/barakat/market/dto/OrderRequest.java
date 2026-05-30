package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Create/update payload for an expected goods order. */
public record OrderRequest(
        LocalDate orderDate,
        @NotNull(message = "Yetkazib berish sanasi kiritilishi shart") LocalDate deliveryDate,
        @NotBlank(message = "Tovar nomi kiritilishi shart") String name,
        String supplier,
        @PositiveOrZero(message = "Summa manfiy bo'lishi mumkin emas") BigDecimal amount,
        String note) {
}
