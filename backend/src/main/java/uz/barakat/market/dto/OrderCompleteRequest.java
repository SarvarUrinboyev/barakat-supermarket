package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import uz.barakat.market.domain.PaymentType;

/**
 * Sent when goods arrive ("Keldi"). The order is marked completed and a
 * matching supermarket expense is created from these payment details.
 */
public record OrderCompleteRequest(
        @NotNull(message = "To'langan summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal amount,
        @NotNull(message = "To'lov turi tanlanishi shart") PaymentType paymentType,
        BigDecimal cashAmount,
        BigDecimal naqdAmount,
        BigDecimal cardAmount,
        LocalDate date) {
}
