package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Sets the morning cash balance for a date. */
public record BalanceRequest(
        @NotNull(message = "Ertalabgi balans kiritilishi shart")
        @PositiveOrZero(message = "Balans manfiy bo'la olmaydi") BigDecimal startingCash,
        LocalDate date) {
}
