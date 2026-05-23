package uz.barakat.market.dto;

import java.time.LocalDateTime;
import uz.barakat.market.domain.StockReason;

/** One row of a product's stock-movement history. */
public record StockMovementResponse(
        Long id,
        int delta,
        int resultingQuantity,
        StockReason reason,
        String note,
        LocalDateTime createdAt) {
}
