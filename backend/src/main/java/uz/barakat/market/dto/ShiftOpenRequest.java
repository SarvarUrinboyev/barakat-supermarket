package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/** Opens a shift and records the morning cash balance for today. */
public record ShiftOpenRequest(
        @NotNull(message = "Ertalabgi balans kiritilishi shart")
        @PositiveOrZero(message = "Balans manfiy bo'la olmaydi") BigDecimal startingCash,
        String openedBy) {
}
