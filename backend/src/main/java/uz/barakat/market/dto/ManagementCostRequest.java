package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.ManagementCostType;

/** Create/update payload for a management cost entry. */
public record ManagementCostRequest(
        LocalDate date,
        @NotNull(message = "Xarajat turi tanlanishi shart") ManagementCostType type,
        @NotBlank(message = "Nomi kiritilishi shart") String name,
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal amount,
        Currency currency,
        String note) {
}
