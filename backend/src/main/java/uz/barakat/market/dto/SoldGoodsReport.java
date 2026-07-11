package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import uz.barakat.market.domain.Currency;

/**
 * The list of goods sold inside a date range, with totals. Powers the
 * Management page CSV / Excel / PDF export. Money values come from the SALE
 * stock-movement price snapshots, which are so'm-canonical after Gate C — so
 * {@code currency} is UZS. (Legacy snapshot-less movements fall back to the
 * product's current price; those rare rows are the only non-so'm edge.)
 */
public record SoldGoodsReport(
        LocalDate from,
        LocalDate to,
        List<SoldGoodsLine> lines,
        int totalUnits,
        BigDecimal totalRevenue,
        BigDecimal totalCost,
        BigDecimal totalProfit,
        Currency currency) {
}
