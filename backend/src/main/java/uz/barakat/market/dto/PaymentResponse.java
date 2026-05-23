package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.PaymentCategory;
import uz.barakat.market.domain.PaymentDirection;
import uz.barakat.market.domain.PaymentType;

/**
 * API view of a payment-journal entry. The {@code source} discriminates
 * native payment rows from virtual rows aggregated out of other tables
 * (expenses, home-expenses, customer ledger). Virtual rows are read-only
 * from this endpoint - the UI links the user back to the source page.
 */
public record PaymentResponse(
        Long id,
        LocalDate date,
        PaymentDirection direction,
        PaymentCategory category,
        String party,
        BigDecimal amount,
        PaymentType method,
        Currency currency,
        String note,
        LocalDateTime createdAt,
        String source) {
}
