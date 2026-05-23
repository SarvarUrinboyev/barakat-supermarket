package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import uz.barakat.market.domain.DebtEntryType;

/** One history row for a debt (a payment or an increase). */
public record DebtPaymentResponse(
        Long id,
        LocalDate paymentDate,
        BigDecimal amount,
        DebtEntryType entryType,
        String note,
        LocalDateTime createdAt) {
}
