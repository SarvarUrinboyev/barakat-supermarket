package uz.barakat.market.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Records the daily Humo / UzCard terminal totals. */
public record TerminalRequest(
        LocalDate date,
        @NotNull(message = "Humo summasi kiritilishi shart")
        @PositiveOrZero(message = "Summa manfiy bo'la olmaydi") BigDecimal humoAmount,
        @NotNull(message = "UzCard summasi kiritilishi shart")
        @PositiveOrZero(message = "Summa manfiy bo'la olmaydi") BigDecimal uzcardAmount) {
}
