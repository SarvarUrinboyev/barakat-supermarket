package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

/**
 * Raw "old notebook" text to be parsed into expenses.
 *
 * <p>If {@code text} starts with a date line (e.g. {@code 25.03.2026})
 * that date is used; otherwise {@code date} (or today) is the fallback.
 */
public record BulkImportRequest(
        @NotBlank(message = "Matn kiritilishi shart") String text,
        LocalDate date) {
}
