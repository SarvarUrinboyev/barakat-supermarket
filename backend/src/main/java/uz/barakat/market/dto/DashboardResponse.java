package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Everything the Dashboard page needs in a single payload. */
public record DashboardResponse(
        LocalDate date,
        boolean shiftOpen,
        Long shiftId,
        BigDecimal startingCash,
        BigDecimal todayExpenseTotal,
        BigDecimal todayKassa,
        BigDecimal todayNaqd,
        BigDecimal todayKarta,
        BigDecimal todayHomeTotal,
        BigDecimal totalDebt,
        BigDecimal estimatedCash,
        List<ExpenseSlice> topExpenses,
        List<OrderResponse> ordersToday,
        List<OrderResponse> ordersTomorrow,
        List<OrderResponse> ordersOverdue) {
}
