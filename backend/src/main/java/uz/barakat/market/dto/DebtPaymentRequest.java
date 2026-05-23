package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Payment towards, or increase of, a debt. */
public record DebtPaymentRequest(
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal amount,
        LocalDate date,
        String note) {
}
