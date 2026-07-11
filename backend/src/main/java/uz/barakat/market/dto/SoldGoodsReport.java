package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import uz.barakat.market.domain.Currency;

/**
 * The list of goods sold inside a date range, with totals. Powers the
 * Management page CSV / Excel / PDF export. Money values come from the SALE
 * stock-movement price snapshots, which are so'm-canonical for every sale rung
 * up AFTER Gate C — so {@code currency} is UZS.
 *
 * <p><b>Known limitation (AM-10):</b> the report tag is a single currency, but a
 * StockMovement carries no currency of its own and no era marker. Sales of the
 * dollar-priced products made BEFORE the Gate C deploy stored genuine USD
 * snapshots; over that history the report prints them as "so'm". A movement has
 * no clean link to its sale_item (which does carry currency), so a correct
 * per-line source would need a currency column on stock_movements (a later
 * gate). Until then the exposure is quantified in the ops runbook
 * (docs/ops/gate-c-p1-cleanup.md §5, "SoldGoods USD-era exposure") and this
 * limitation is documented rather than silently mislabeled.
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
