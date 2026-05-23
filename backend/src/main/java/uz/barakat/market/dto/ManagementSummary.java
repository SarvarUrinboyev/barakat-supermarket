package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * The Management page payload. Sales figures are derived automatically
 * from warehouse SALE stock movements; costs are the manually-entered
 * salary / tax / other entries.
 *
 * <p>{@code grossProfit = salesRevenue - costOfGoods} and
 * {@code netProfit = grossProfit - salaryTotal - taxTotal - otherTotal}.
 */
public record ManagementSummary(
        LocalDate from,
        LocalDate to,
        BigDecimal salesRevenue,
        BigDecimal costOfGoods,
        BigDecimal grossProfit,
        int unitsSold,
        BigDecimal salaryTotal,
        BigDecimal taxTotal,
        BigDecimal otherTotal,
        BigDecimal costTotal,
        BigDecimal netProfit,
        List<ManagementCostResponse> costs) {
}
