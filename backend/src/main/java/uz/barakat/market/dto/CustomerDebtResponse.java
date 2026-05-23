package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** API view of a "debt owed to us" record, including progress-bar fields. */
public record CustomerDebtResponse(
        Long id,
        LocalDate date,
        String customerName,
        String productName,
        BigDecimal originalAmount,
        BigDecimal paidAmount,
        BigDecimal remainingAmount,
        int paidPercent,
        boolean paid,
        String note,
        LocalDateTime createdAt) {
}
