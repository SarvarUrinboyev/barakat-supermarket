package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Sale;
import uz.barakat.market.domain.SaleItem;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.dto.AccountingDtos.ProfitLossResponse;
import uz.barakat.market.dto.AccountingDtos.TrialBalanceResponse;
import uz.barakat.market.dto.PosDtos.CartItem;
import uz.barakat.market.dto.PosDtos.CheckoutRequest;
import uz.barakat.market.dto.PosDtos.SaleResponse;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.SaleRepository;
import uz.barakat.market.repository.ShopRepository;

/**
 * Gate C currency behaviour at the POS + ledger (D6, AM-6): a USD product sells
 * at the shop kurs folded into a so'm-canonical total with the rate pinned per
 * line; a UZS product needs no kurs; a USD line with no kurs BLOCKS checkout
 * (the system never guesses a rate); a mixed cart's Jami is UZS lines plus USD
 * lines × kurs; and the ledger reconciles UZS + USD sales in one unit.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:pos_currency_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false"
})
class PosCurrencyIT {

    @Autowired private PosService pos;
    @Autowired private ProductRepository products;
    @Autowired private SaleRepository sales;
    @Autowired private ShopRepository shops;
    @Autowired private FinancialStatementService statements;
    @Autowired private LedgerBackfillService backfill;

    private long shopId;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private long newShop(BigDecimal kurs) {
        Shop s = new Shop();
        s.setAccountId(1L);
        s.setName("Currency POS shop");
        s.setUsdRate(kurs);
        long id = shops.save(s).getId();
        TenantContext.setShopId(id);
        return id;
    }

    private Product product(String name, long cost, long sale, int qty, Currency currency) {
        Product p = new Product();
        p.setName(name);
        p.setPurchasePrice(BigDecimal.valueOf(cost));
        p.setSalePrice(BigDecimal.valueOf(sale));
        p.setQuantity(qty);
        p.setCurrency(currency);
        return products.save(p);
    }

    private SaleResponse checkout(CartItem... items) {
        return pos.checkout(new CheckoutRequest(
                List.of(items), BigDecimal.ZERO, BigDecimal.ZERO, "NAQD", null, null, null),
                "tester");
    }

    private static CartItem line(Product p, int qty) {
        return new CartItem(p.getId(), qty, BigDecimal.ZERO, null);
    }

    // ---- USD product: folded to so'm at kurs, rate pinned per line ----

    @Test
    void usdProductSellsAtKursStoredSomCanonicalWithPinnedRate() {
        shopId = newShop(new BigDecimal("12000"));
        Product phone = product("Smartfon", 1100, 1350, 5, Currency.USD);

        SaleResponse resp = checkout(line(phone, 1));

        // Jami is so'm: $1 350 × 12 000 = 16 200 000.
        assertThat(resp.totalUzs()).isEqualByComparingTo("16200000");

        Sale sale = sales.findById(resp.id()).orElseThrow();
        assertThat(sale.getCurrency()).isEqualTo(Currency.UZS);            // som-canonical
        assertThat(sale.getUsdRateAtSale()).isEqualByComparingTo("12000"); // pinned
        SaleItem item = sale.getItems().get(0);
        assertThat(item.getCurrency()).isEqualTo(Currency.USD);            // native, for the receipt
        assertThat(item.getUsdRateAtSale()).isEqualByComparingTo("12000");
        assertThat(item.getUnitPriceUzs()).isEqualByComparingTo("16200000");
        assertThat(item.getCostAtSaleUzs()).isEqualByComparingTo("13200000"); // 1100 × 12 000

        // Ledger is USD-canonical: revenue back out to $1 350 via the pinned rate.
        backfill.run();
        ProfitLossResponse pnl = statements.profitLoss(
                LocalDate.now().withDayOfMonth(1), LocalDate.now());
        assertThat(pnl.revenueTotal()).isEqualByComparingTo("1350");
        assertThat(pnl.cogsTotal()).isEqualByComparingTo("1100");
    }

    // ---- USD line with no kurs → checkout blocked, nothing persisted ----

    @Test
    void usdLineWithoutKursBlocksCheckout() {
        shopId = newShop(null);   // kurs not configured
        Product phone = product("Smartfon", 1100, 1350, 5, Currency.USD);

        long salesBefore = sales.count();   // shared in-memory DB — measure a delta
        assertThatThrownBy(() -> checkout(line(phone, 1)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("kurs");

        // Nothing persisted: no new sale, stock un-decremented (tx rolled back).
        assertThat(sales.count()).isEqualTo(salesBefore);
        assertThat(products.findById(phone.getId()).orElseThrow().getQuantity()).isEqualTo(5);
    }

    // ---- UZS product needs no kurs ----

    @Test
    void uzsProductSellsWithoutAnyKurs() {
        shopId = newShop(null);
        Product bread = product("Non", 3000, 5000, 10, Currency.UZS);

        SaleResponse resp = checkout(line(bread, 2));

        assertThat(resp.totalUzs()).isEqualByComparingTo("10000");   // 5 000 × 2, passthrough
        Sale sale = sales.findById(resp.id()).orElseThrow();
        assertThat(sale.getItems().get(0).getCurrency()).isEqualTo(Currency.UZS);
        assertThat(sale.getItems().get(0).getUsdRateAtSale()).isNull();
    }

    // ---- mixed cart: Jami = UZS line + USD line × kurs ----

    @Test
    void mixedCartFoldsUsdAtKursIntoSomTotal() {
        shopId = newShop(new BigDecimal("12650"));
        Product bread = product("Non", 3000, 5000, 10, Currency.UZS);
        Product phone = product("Smartfon", 1100, 1350, 5, Currency.USD);

        SaleResponse resp = checkout(line(bread, 1), line(phone, 1));

        // 5 000 (so'm) + 1 350 × 12 650 = 5 000 + 17 077 500 = 17 082 500.
        assertThat(resp.totalUzs()).isEqualByComparingTo("17082500");
        Sale sale = sales.findById(resp.id()).orElseThrow();
        assertThat(sale.getUsdRateAtSale()).isEqualByComparingTo("12650");
    }

    // ---- AM-6: the ledger reconciles UZS + USD sales in one unit ----

    @Test
    void ledgerReconcilesAcrossUzsAndUsdSalesInOneUnit() {
        shopId = newShop(new BigDecimal("12000"));
        Product bread = product("Non", 3000, 5000, 100, Currency.UZS);
        Product phone = product("Smartfon", 1100, 1350, 100, Currency.USD);

        checkout(line(bread, 3));    // pure so'm sale
        checkout(line(phone, 2));    // dollar sale, folded at kurs

        backfill.run();
        TrialBalanceResponse tb = statements.trialBalance(
                LocalDate.now().withDayOfMonth(1), LocalDate.now());
        assertThat(tb.balanced()).isTrue();
        assertThat(tb.totalDebit()).isEqualByComparingTo(tb.totalCredit());
        assertThat(tb.totalDebit().signum()).isPositive();
    }
}
