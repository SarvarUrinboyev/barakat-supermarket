package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** API view of a "my debt" record, including progress-bar fields. */
public record DebtorResponse(
        Long id,
        LocalDate date,
        String name,
        String productName,
        BigDecimal originalAmount,
        BigDecimal paidAmount,
        BigDecimal remainingAmount,
        int paidPercent,
        boolean paid,
        String note,
        LocalDateTime createdAt) {
}
