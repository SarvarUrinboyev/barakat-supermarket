package uz.barakat.market.dto;

import java.util.List;

/** Outcome of a CSV / XLSX product import. */
public record ProductImportResult(
        int importedCount,
        int skippedCount,
        List<String> errors) {
}
