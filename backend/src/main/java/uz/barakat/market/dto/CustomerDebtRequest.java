package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Create/update payload for a "debt owed to us" record (a customer owes us). */
public record CustomerDebtRequest(
        LocalDate date,
        @NotBlank(message = "Mijoz ismi kiritilishi shart") String customerName,
        String productName,
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal originalAmount,
        BigDecimal paidAmount,
        String note) {
}
