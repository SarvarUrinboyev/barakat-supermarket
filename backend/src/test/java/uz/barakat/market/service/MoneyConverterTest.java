package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import uz.barakat.market.dto.ExchangeRateResponse;
import uz.barakat.market.service.MoneyConverter.RateSource;

/**
 * Rate provenance (AM-7/8): resolveRate() reports where the USD→UZS rate came
 * from so postings can record it. A live CBU rate is tagged CBU; when the feed
 * is unreachable the fallback constant is used but tagged FALLBACK so those
 * postings can be found and re-rated — never silently trusted.
 */
@ExtendWith(MockitoExtension.class)
class MoneyConverterTest {

    @Mock private ExchangeRateService exchangeRate;

    @Test
    void liveCbuRateIsTaggedCbu() {
        when(exchangeRate.current()).thenReturn(
                new ExchangeRateResponse(new BigDecimal("12650"), LocalDate.now(), true));
        MoneyConverter converter = new MoneyConverter(exchangeRate);

        MoneyConverter.RateResolution rr = converter.resolveRate();

        assertThat(rr.source()).isEqualTo(RateSource.CBU);
        assertThat(rr.rate()).isEqualByComparingTo("12650");
    }

    @Test
    void unavailableFeedFallsBackAndIsTaggedFallback() {
        when(exchangeRate.current()).thenReturn(
                new ExchangeRateResponse(null, LocalDate.now(), false));
        MoneyConverter converter = new MoneyConverter(exchangeRate);

        MoneyConverter.RateResolution rr = converter.resolveRate();

        assertThat(rr.source()).isEqualTo(RateSource.FALLBACK);
        assertThat(rr.rate()).isEqualByComparingTo(MoneyConverter.FALLBACK_USD_UZS);
    }

    @Test
    void zeroOrNullRateIsTreatedAsUnavailable() {
        when(exchangeRate.current()).thenReturn(
                new ExchangeRateResponse(BigDecimal.ZERO, LocalDate.now(), true));
        MoneyConverter converter = new MoneyConverter(exchangeRate);

        assertThat(converter.resolveRate().source()).isEqualTo(RateSource.FALLBACK);
    }
}
