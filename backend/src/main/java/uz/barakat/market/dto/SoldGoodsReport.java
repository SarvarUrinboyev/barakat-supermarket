package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * The list of goods sold inside a date range, with totals. Powers the
 * Management page CSV / Excel / PDF export. All money values are in USD.
 */
public record SoldGoodsReport(
        LocalDate from,
        LocalDate to,
        List<SoldGoodsLine> lines,
        int totalUnits,
        BigDecimal totalRevenue,
        BigDecimal totalCost,
        BigDecimal totalProfit) {
}
