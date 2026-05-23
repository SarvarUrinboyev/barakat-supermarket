package uz.barakat.market.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.dto.ExchangeRateResponse;

/**
 * Converts money amounts between USD and UZS using the live Central-Bank
 * rate. USD is the canonical unit, so every cross-currency total in the
 * app is produced by converting each record to USD first.
 */
@Service
public class MoneyConverter {

    /** Used only if the live rate has never been fetched (first run, offline). */
    private static final BigDecimal FALLBACK_USD_UZS = new BigDecimal("12700");

    private final ExchangeRateService exchangeRate;

    public MoneyConverter(ExchangeRateService exchangeRate) {
        this.exchangeRate = exchangeRate;
    }

    /** How many UZS one USD is worth right now. */
    public BigDecimal usdToUzs() {
        ExchangeRateResponse snapshot = exchangeRate.current();
        if (snapshot != null && snapshot.available()
                && snapshot.rate() != null && snapshot.rate().signum() > 0) {
            return snapshot.rate();
        }
        return FALLBACK_USD_UZS;
    }

    /** Converts {@code amount} (given in {@code currency}) to USD. */
    public BigDecimal toUsd(BigDecimal amount, Currency currency) {
        if (amount == null) {
            return BigDecimal.ZERO;
        }
        if (currency == null || currency == Currency.USD) {
            return amount;
        }
        return amount.divide(usdToUzs(), 2, RoundingMode.HALF_UP);
    }
}
