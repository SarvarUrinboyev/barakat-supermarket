package uz.barakat.market.dto;

import java.time.LocalDate;
import java.util.List;

/** Outcome of parsing a bulk-import text, used for the preview step. */
public record BulkParseResult(
        LocalDate date,
        int validCount,
        int invalidCount,
        List<ParsedLine> lines) {
}
