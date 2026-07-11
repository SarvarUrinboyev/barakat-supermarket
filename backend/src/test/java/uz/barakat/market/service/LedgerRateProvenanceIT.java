package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.JournalEntry;
import uz.barakat.market.domain.JournalSource;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.dto.ExchangeRateResponse;
import uz.barakat.market.dto.PosDtos.CartItem;
import uz.barakat.market.dto.PosDtos.CheckoutRequest;
import uz.barakat.market.dto.PosDtos.SaleResponse;
import uz.barakat.market.repository.JournalEntryRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.service.MoneyConverter.RateSource;

/**
 * Rate provenance on the ledger (AM-7/8): every sale posting records the rate
 * it converted at AND where that rate came from. A pinned-at-sale rate is
 * PINNED; a pure-so'm sale with a live feed is CBU; with the feed unreachable
 * it is the fallback constant tagged FALLBACK — and such entries surface on the
 * re-rating worklist (findByRateSource) rather than being silently trusted.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:ledger_rate_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false"
})
class LedgerRateProvenanceIT {

    @Autowired private PosService pos;
    @Autowired private ProductRepository products;
    @Autowired private ShopRepository shops;
    @Autowired private LedgerBackfillService backfill;
    @Autowired private JournalEntryRepository journalEntries;
    @MockBean private ExchangeRateService exchangeRate;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private long newShop(BigDecimal kurs) {
        Shop s = new Shop();
        s.setAccountId(1L);
        s.setName("Rate provenance shop");
        s.setUsdRate(kurs);
        long id = shops.save(s).getId();
        TenantContext.setShopId(id);
        return id;
    }

    private Product product(String name, long cost, long sale, Currency currency) {
        Product p = new Product();
        p.setName(name);
        p.setPurchasePrice(BigDecimal.valueOf(cost));
        p.setSalePrice(BigDecimal.valueOf(sale));
        p.setQuantity(100);
        p.setCurrency(currency);
        return products.save(p);
    }

    private SaleResponse sell(Product p) {
        return pos.checkout(new CheckoutRequest(
                List.of(new CartItem(p.getId(), 1, BigDecimal.ZERO, null)),
                BigDecimal.ZERO, BigDecimal.ZERO, "NAQD", null, null, null), "tester");
    }

    private JournalEntry entryFor(SaleResponse sale) {
        backfill.run();
        return journalEntries.findFirstBySourceAndSourceRef(
                JournalSource.SALE, String.valueOf(sale.id())).orElseThrow();
    }

    @Test
    void pureSomSaleWithLiveFeedRecordsCbuRate() {
        when(exchangeRate.current()).thenReturn(
                new ExchangeRateResponse(new BigDecimal("12650"), LocalDate.now(), true));
        newShop(null);
        SaleResponse sale = sell(product("Non", 3000, 5000, Currency.UZS));

        JournalEntry e = entryFor(sale);
        assertThat(e.getRateSource()).isEqualTo(RateSource.CBU);
        assertThat(e.getUsdRate()).isEqualByComparingTo("12650");
    }

    @Test
    void pureSomSaleWithDeadFeedRecordsFlaggedFallbackAndHitsWorklist() {
        when(exchangeRate.current()).thenReturn(
                new ExchangeRateResponse(null, LocalDate.now(), false));
        newShop(null);
        SaleResponse sale = sell(product("Non", 3000, 5000, Currency.UZS));

        JournalEntry e = entryFor(sale);
        assertThat(e.getRateSource()).isEqualTo(RateSource.FALLBACK);
        assertThat(e.getUsdRate()).isEqualByComparingTo(MoneyConverter.FALLBACK_USD_UZS);

        // AM-8: the fallback-tainted entry is findable for re-rating.
        assertThat(journalEntries.findByRateSourceOrderByEntryDateDescIdDesc(RateSource.FALLBACK))
                .anyMatch(je -> je.getId().equals(e.getId()));
    }

    @Test
    void usdSaleRecordsThePinnedRate() {
        // Even with a live feed, a USD sale uses the kurs pinned at sell time.
        when(exchangeRate.current()).thenReturn(
                new ExchangeRateResponse(new BigDecimal("99999"), LocalDate.now(), true));
        newShop(new BigDecimal("12000"));
        SaleResponse sale = sell(product("Smartfon", 1100, 1350, Currency.USD));

        JournalEntry e = entryFor(sale);
        assertThat(e.getRateSource()).isEqualTo(RateSource.PINNED);
        assertThat(e.getUsdRate()).isEqualByComparingTo("12000");   // not the 99999 live rate
    }
}
