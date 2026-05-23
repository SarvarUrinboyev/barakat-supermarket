package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.PaymentType;

/** Create/update payload for a single shop expense. QARZGA is not allowed. */
public record HomeExpenseRequest(
        LocalDate date,
        @NotBlank(message = "Nomi kiritilishi shart") String name,
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal amount,
        @NotNull(message = "To'lov turi tanlanishi shart") PaymentType paymentType,
        BigDecimal cashAmount,
        BigDecimal naqdAmount,
        BigDecimal cardAmount,
        Currency currency,
        String note) {
}
