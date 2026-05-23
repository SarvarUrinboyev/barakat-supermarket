package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One sold-goods line for the Management export — a single warehouse SALE
 * stock movement, priced with the product's current sale / cost price.
 * All money values are in USD.
 */
public record SoldGoodsLine(
        LocalDateTime soldAt,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal unitCost,
        BigDecimal lineRevenue,
        BigDecimal lineCost,
        BigDecimal lineProfit,
        String note) {
}
