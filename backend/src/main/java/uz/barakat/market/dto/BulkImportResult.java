package uz.barakat.market.dto;

import java.time.LocalDate;
import java.util.List;

/** Outcome of committing a bulk import. */
public record BulkImportResult(
        LocalDate date,
        int savedCount,
        int skippedCount,
        List<String> errors) {
}
