package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Today's USD exchange rate. {@code rate} is so'm per 1 USD;
 * it is {@code null} and {@code available} is false when the rate
 * could not be fetched (no internet).
 */
public record ExchangeRateResponse(
        BigDecimal rate,
        LocalDate date,
        boolean available) {
}
