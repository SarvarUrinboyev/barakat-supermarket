package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Create/update payload for a "my debt" record (owed to a supplier). */
public record DebtorRequest(
        LocalDate date,
        @NotBlank(message = "Ism kiritilishi shart") String name,
        String productName,
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal originalAmount,
        BigDecimal paidAmount,
        String note) {
}
