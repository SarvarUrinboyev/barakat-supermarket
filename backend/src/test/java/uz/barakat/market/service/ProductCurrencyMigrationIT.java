package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.dto.ProductRequest;
import uz.barakat.market.repository.ShopRepository;

/**
 * Proves the V38 currency backfill discriminator (Gate C, AM-3) against
 * populations built through the REAL service paths, so the opening-stock
 * movement notes the backfill keys on ("Boshlang'ich qoldiq" for individual
 * creation, "Import (fayldan)" for UI bulk import) are the genuine ones the
 * app writes — not hand-forged fixtures.
 *
 * <p>V38 itself ran at startup against an empty products table (no-op). This
 * test recreates the two pre-feature populations, then executes the exact
 * backfill UPDATEs from V38 (idempotent — safe to re-run) and asserts the
 * resulting per-row currency and the counts (N hand-created → USD, the rest
 * → UZS). If the V38 backfill SQL changes, mirror it in {@link #BACKFILL_*}.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:currency_migration_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false"
})
class ProductCurrencyMigrationIT {

    /** Verbatim from V38__product_sale_currency.sql — keep in sync. */
    private static final String BACKFILL_PRODUCTS = """
            UPDATE products SET currency = 'USD'
            WHERE id IN (
                    SELECT sm.product_id FROM stock_movements sm
                    WHERE sm.note = 'Boshlang''ich qoldiq' AND sm.product_id IS NOT NULL
                )
              AND id NOT IN (
                    SELECT sm2.product_id FROM stock_movements sm2
                    WHERE sm2.note = 'Import (fayldan)' AND sm2.product_id IS NOT NULL
                )""";

    @Autowired private ProductService productService;
    @Autowired private ShopRepository shops;
    @Autowired private JdbcTemplate jdbc;

    private long shopId;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private long freshShop() {
        long accountId = shops.findAll().stream().findFirst().orElseThrow().getAccountId();
        Shop s = new Shop();
        s.setAccountId(accountId);
        s.setName("Currency migration shop");
        s.setMain(false);
        return shops.save(s).getId();
    }

    private ProductRequest req(String name, BigDecimal purchase, int qty) {
        return new ProductRequest(name, null, null, null, purchase, purchase.add(BigDecimal.ONE),
                qty, null, null, null, 0, null, null, "dona", null, false, null);
    }

    @Test
    void backfillFlipsHandCreatedToUsdAndLeavesImportedUzs() {
        shopId = freshShop();
        TenantContext.setShopId(shopId);

        // Population A: individually created (form/scanner) → note "Boshlang'ich qoldiq".
        productService.create(req("Hand Alpha", new BigDecimal("1200"), 5));
        productService.create(req("Hand Beta", new BigDecimal("1350"), 3));
        productService.create(req("Hand Gamma", new BigDecimal("999"), 1));

        // Population B: UI bulk import → note "Import (fayldan)".
        String csv = "Nomi,Kelish narxi,Sotilish narxi,Miqdor\n"
                + "Import One,1000,1500,4\n"
                + "Import Two,2000,2500,4\n"
                + "Import Three,3000,3500,4\n"
                + "Import Four,4000,4500,4\n"
                + "Import Five,5000,5500,4\n";
        productService.importProducts(new MockMultipartFile(
                "file", "p.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)));
        TenantContext.clear();

        // Pre-backfill: every row in this shop carries the UZS default. Assert
        // via JDBC (scoped by shop_id) so we read raw DB state without tripping
        // the entity's cross-tenant @PostLoad guard on other tests' rows.
        assertThat(currencyCount(shopId, "UZS")).isEqualTo(8);
        assertThat(currencyCount(shopId, "USD")).isZero();

        // Run the shipped V38 backfill (idempotent).
        jdbc.update(BACKFILL_PRODUCTS);

        assertThat(currencyOf(shopId, "Hand Alpha")).isEqualTo("USD");
        assertThat(currencyOf(shopId, "Hand Beta")).isEqualTo("USD");
        assertThat(currencyOf(shopId, "Hand Gamma")).isEqualTo("USD");
        assertThat(currencyOf(shopId, "Import One")).isEqualTo("UZS");
        assertThat(currencyOf(shopId, "Import Five")).isEqualTo("UZS");
        assertThat(currencyCount(shopId, "USD")).as("exactly the 3 hand-created").isEqualTo(3);
        assertThat(currencyCount(shopId, "UZS")).as("the 5 imported").isEqualTo(5);
    }

    @Test
    void zeroQuantityCreatedProductHasNoOpeningMovementAndStaysUzs() {
        shopId = freshShop();
        TenantContext.setShopId(shopId);
        // qty 0 → ProductService logs no opening movement, so the note-based
        // backfill can't see it; it correctly keeps the UZS default.
        productService.create(req("Zero Stock", new BigDecimal("777"), 0));
        TenantContext.clear();

        jdbc.update(BACKFILL_PRODUCTS);

        assertThat(currencyOf(shopId, "Zero Stock")).isEqualTo("UZS");
    }

    private String currencyOf(long shop, String name) {
        return jdbc.queryForObject(
                "SELECT currency FROM products WHERE shop_id = ? AND name = ?",
                String.class, shop, name);
    }

    private long currencyCount(long shop, String currency) {
        Long n = jdbc.queryForObject(
                "SELECT count(*) FROM products WHERE shop_id = ? AND currency = ?",
                Long.class, shop, currency);
        return n == null ? -1 : n;
    }
}
