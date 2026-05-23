package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.PaymentType;

/** API view of a shop expense. */
public record HomeExpenseResponse(
        Long id,
        LocalDate date,
        String name,
        BigDecimal amount,
        PaymentType paymentType,
        BigDecimal cashAmount,
        BigDecimal naqdAmount,
        BigDecimal cardAmount,
        Currency currency,
        String note,
        LocalDateTime createdAt) {
}
