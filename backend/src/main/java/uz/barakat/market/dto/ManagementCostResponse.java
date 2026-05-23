package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.ManagementCostType;

/** API view of a management cost entry. */
public record ManagementCostResponse(
        Long id,
        LocalDate date,
        ManagementCostType type,
        String name,
        BigDecimal amount,
        Currency currency,
        String note,
        LocalDateTime createdAt) {
}
