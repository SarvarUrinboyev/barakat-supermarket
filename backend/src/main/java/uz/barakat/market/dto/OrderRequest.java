package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Create/update payload for an expected goods order. */
public record OrderRequest(
        LocalDate orderDate,
        @NotNull(message = "Yetkazib berish sanasi kiritilishi shart") LocalDate deliveryDate,
        @NotBlank(message = "Tovar nomi kiritilishi shart") String name,
        String supplier,
        BigDecimal amount,
        String note) {
}
