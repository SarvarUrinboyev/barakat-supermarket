package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.util.List;

/** Both sides of the Debt page in one payload. */
public record DebtSummary(
        List<DebtorResponse> myDebts,
        List<CustomerDebtResponse> customerDebts,
        BigDecimal myDebtTotal,
        BigDecimal customerDebtTotal) {
}
