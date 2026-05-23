package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * API view of an order. {@code status} is derived: {@code TODAY},
 * {@code OVERDUE}, {@code UPCOMING} or {@code COMPLETED}.
 */
public record OrderResponse(
        Long id,
        LocalDate orderDate,
        LocalDate deliveryDate,
        String name,
        String supplier,
        BigDecimal amount,
        boolean completed,
        LocalDateTime completedAt,
        String note,
        String status) {
}
