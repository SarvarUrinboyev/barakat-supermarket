package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.CustomerTxType;

/** API view of one customer-ledger line. */
public record CustomerTransactionResponse(
        Long id,
        LocalDate date,
        CustomerTxType type,
        String description,
        BigDecimal amount,
        /** Currency of {@code amount} (Gate C Q3) — drives "$" vs "so'm". */
        Currency currency,
        String note,
        LocalDateTime createdAt) {
}
