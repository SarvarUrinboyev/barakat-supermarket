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

    /**
     * Last-resort rate when the CBU feed has never been reachable. A posting
     * made with it is <em>flagged</em> ({@link RateSource#FALLBACK}) so it can
     * be re-rated once a real rate is known — never silently trusted (AM-8).
     */
    public static final BigDecimal FALLBACK_USD_UZS = new BigDecimal("12700");

    /** Where a resolved USD→UZS rate came from — recorded on each posting (AM-7). */
    public enum RateSource { PINNED, CBU, FALLBACK }

    /** A resolved rate plus its provenance. */
    public record RateResolution(BigDecimal rate, RateSource source) {
    }

    private final ExchangeRateService exchangeRate;

    public MoneyConverter(ExchangeRateService exchangeRate) {
        this.exchangeRate = exchangeRate;
    }

    /**
     * The current USD→UZS rate together with its source: the live CBU rate when
     * the feed is reachable, otherwise the flagged {@link RateSource#FALLBACK}
     * constant. Callers persist both so every conversion is reproducible and
     * fallback-tainted postings are findable.
     */
    public RateResolution resolveRate() {
        ExchangeRateResponse snapshot = exchangeRate.current();
        if (snapshot != null && snapshot.available()
                && snapshot.rate() != null && snapshot.rate().signum() > 0) {
            return new RateResolution(snapshot.rate(), RateSource.CBU);
        }
        return new RateResolution(FALLBACK_USD_UZS, RateSource.FALLBACK);
    }

    /** How many UZS one USD is worth right now (rate only; see {@link #resolveRate}). */
    public BigDecimal usdToUzs() {
        return resolveRate().rate();
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
