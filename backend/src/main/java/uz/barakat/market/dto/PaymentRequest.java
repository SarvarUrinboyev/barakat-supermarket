package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.PaymentCategory;
import uz.barakat.market.domain.PaymentDirection;
import uz.barakat.market.domain.PaymentType;

/** Create/update payload for a payment-journal entry. */
public record PaymentRequest(
        LocalDate date,
        @NotNull(message = "Yo'nalish tanlanishi shart") PaymentDirection direction,
        @NotNull(message = "Turi tanlanishi shart") PaymentCategory category,
        String party,
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal amount,
        @NotNull(message = "To'lov usuli tanlanishi shart") PaymentType method,
        Currency currency,
        String note) {
}
