package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.PaymentType;

/**
 * Create/update payload for a single expense.
 *
 * <p>The {@code cashAmount} / {@code naqdAmount} / {@code cardAmount}
 * fields only need to be supplied for {@link PaymentType#ARALASH}; for
 * other payment types the service derives the split automatically.
 * {@code currency} defaults to UZS when omitted.
 */
public record ExpenseRequest(
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
