package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * API view of a supplier. {@code paidTotal} sums all outgoing payments
 * to this supplier from the journal (USD-normalised); {@code balance}
 * is the running difference (currently equals paidTotal until we add
 * goods-received tracking).
 */
public record SupplierResponse(
        Long id,
        String name,
        String phone,
        String address,
        String note,
        BigDecimal paidTotal,
        BigDecimal balance,
        LocalDateTime createdAt) {
}
