package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ShopRepository;

/**
 * CSV import through the REAL HTTP boundary (Spring Security + JwtAuthFilter +
 * TenantFilter + Hibernate tenant filter), written against the production
 * false-positive of 2026-07-11: a 6114-row file was reported 100% "Bu nomli
 * mahsulot allaqachon mavjud" in a shop holding only ~70 products.
 *
 * <p>Root cause: the upload request carried no {@code X-Shop-Id}, so
 * {@code TenantFilter}'s first-login fallback silently re-scoped the whole
 * import to the account's MAIN shop — whose catalogue (imported earlier from
 * the same YesPOS source) already held every name. {@link
 * #withoutShopHeaderImportIsScopedToMainShopNotTheOneOnScreen} reproduces that
 * mechanism deterministically; the other tests pin the correct scoped
 * behaviour and the duplicate rule (same-tenant, normalized name). Every
 * counter assertion is verified against a {@code SELECT count(*)}, not the
 * response arithmetic.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:import_endpoint_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false"
})
class ProductImportEndpointIT {

    /** Must match savdopro.jwt.secret in application-test.properties. */
    private static final String SECRET = "test-only-jwt-secret-not-for-production-0123456789abcdef";

    private static final long ACCOUNT = 90_021L;
    private static final String CSV_HEADER =
            "Nomi,Shtrix kod,IMEI 1,IMEI 2,Kelish narxi,Sotilish narxi,Miqdor,Toifa\n";

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ShopRepository shops;
    @Autowired private ProductRepository products;

    private long mainShop;
    private long subShop;

    @BeforeEach
    void seedAccountWithMainAndSubShop() {
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) "
                        + "SELECT ?, ?, FALSE, now() WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE id = ?)",
                ACCOUNT, "Import IT Account", ACCOUNT);
        mainShop = shop("Import IT Main", true);
        subShop = shop("Import IT Sub", false);
        TenantContext.clear();
    }

    @AfterEach
    void cleanup() {
        TenantContext.clear();
        jdbc.update("DELETE FROM stock_movements WHERE shop_id IN (?, ?)", mainShop, subShop);
        jdbc.update("DELETE FROM products WHERE shop_id IN (?, ?)", mainShop, subShop);
        jdbc.update("DELETE FROM categories WHERE shop_id IN (?, ?)", mainShop, subShop);
        jdbc.update("DELETE FROM shops WHERE id IN (?, ?)", mainShop, subShop);
    }

    // ---- T6.1: fresh names land in the shop the header points at ----

    @Test
    void freshNamesAllImportedIntoSelectedShop() throws Exception {
        mvc.perform(multipart("/api/products/import")
                        .file(csv(testCsv(20)))
                        .header("Authorization", bearer())
                        .header("X-Shop-Id", String.valueOf(subShop)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(20))
                .andExpect(jsonPath("$.skippedCount").value(0));

        assertThat(countProducts(subShop)).isEqualTo(20);
        assertThat(countProducts(mainShop)).isZero();
    }

    // ---- T6.2: a true same-tenant duplicate is skipped, normalized ----

    @Test
    void sameTenantDuplicateIsSkippedEvenWithCaseAndWhitespaceVariance() throws Exception {
        seedProduct(subShop, "Olma  Sharbati 1L");

        String csv = CSV_HEADER
                + "olma sharbati 1l,,,,1.50,2.00,5,Umumiy\n"
                + "Yangi mahsulot A,,,,1.00,1.50,3,Umumiy\n";
        mvc.perform(multipart("/api/products/import")
                        .file(csv(csv))
                        .header("Authorization", bearer())
                        .header("X-Shop-Id", String.valueOf(subShop)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(1))
                .andExpect(jsonPath("$.skippedCount").value(1))
                .andExpect(jsonPath("$.errors[0]").value(
                        org.hamcrest.Matchers.containsString("allaqachon mavjud")));

        assertThat(countProducts(subShop)).isEqualTo(2);
    }

    // ---- T6.3: the prod regression — a name in ANOTHER shop must NOT block ----

    @Test
    void nameExistingOnlyInAnotherShopDoesNotBlockScopedImport() throws Exception {
        for (int i = 1; i <= 20; i++) {
            seedProduct(mainShop, testName(i));
        }

        mvc.perform(multipart("/api/products/import")
                        .file(csv(testCsv(20)))
                        .header("Authorization", bearer())
                        .header("X-Shop-Id", String.valueOf(subShop)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(20))
                .andExpect(jsonPath("$.skippedCount").value(0));

        assertThat(countProducts(subShop)).isEqualTo(20);
        assertThat(countProducts(mainShop)).isEqualTo(20);
    }

    // ---- T6.4: re-running the same file is idempotent, no corruption ----

    @Test
    void rerunningTheSameFileImportsNothingAndCorruptsNothing() throws Exception {
        mvc.perform(multipart("/api/products/import")
                        .file(csv(testCsv(20)))
                        .header("Authorization", bearer())
                        .header("X-Shop-Id", String.valueOf(subShop)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(20));

        mvc.perform(multipart("/api/products/import")
                        .file(csv(testCsv(20)))
                        .header("Authorization", bearer())
                        .header("X-Shop-Id", String.valueOf(subShop)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(0))
                .andExpect(jsonPath("$.skippedCount").value(20));

        assertThat(countProducts(subShop)).isEqualTo(20);
    }

    // ---- T2: deterministic reproduction of the 2026-07-11 prod symptom ----

    /**
     * Characterisation of the defect's server half: WITHOUT {@code X-Shop-Id}
     * the import is silently re-scoped to the account's main shop by
     * TenantFilter's first-login fallback. When the main shop already holds the
     * file's names (prod: the earlier YesPOS-sourced catalogue), every row —
     * from Qator 2 on — reports "allaqachon mavjud" and nothing is written
     * anywhere, exactly the observed 0 / 6114. The client-side fix is to always
     * send the header (frontend uploadFile); this test documents why.
     */
    @Test
    void withoutShopHeaderImportIsScopedToMainShopNotTheOneOnScreen() throws Exception {
        for (int i = 1; i <= 20; i++) {
            seedProduct(mainShop, testName(i));
        }

        mvc.perform(multipart("/api/products/import")
                        .file(csv(testCsv(20)))
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(0))
                .andExpect(jsonPath("$.skippedCount").value(20))
                .andExpect(jsonPath("$.errors[0]").value(
                        org.hamcrest.Matchers.containsString("allaqachon mavjud")));

        // Nothing inserted in either shop — the false positives blocked it all.
        assertThat(countProducts(subShop)).isZero();
        assertThat(countProducts(mainShop)).isEqualTo(20);
    }

    // ---- current schema behaviour: fractional Miqdor is rounded to int ----

    @Test
    void fractionalQuantityIsRoundedToNearestUnit() throws Exception {
        String csv = CSV_HEADER + "Guruch kg,,,,1.20,1.80,10.925,Umumiy\n";
        mvc.perform(multipart("/api/products/import")
                        .file(csv(csv))
                        .header("Authorization", bearer())
                        .header("X-Shop-Id", String.valueOf(subShop)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importedCount").value(1));

        Integer qty = jdbc.queryForObject(
                "SELECT quantity FROM products WHERE shop_id = ? AND name = 'Guruch kg'",
                Integer.class, subShop);
        // products.quantity is an integer column; 10.925 becomes 11. Preserving
        // fractional stock for weighed goods needs a schema change (D1 scope).
        assertThat(qty).isEqualTo(11);
    }

    // ------------------------------------------------------------ helpers

    private long shop(String name, boolean main) {
        Shop s = new Shop();
        s.setAccountId(ACCOUNT);
        s.setName(name);
        s.setMain(main);
        return shops.save(s).getId();
    }

    private void seedProduct(long shopId, String name) {
        TenantContext.setShopId(shopId);
        Product p = new Product();
        p.setName(name);
        p.setPurchasePrice(BigDecimal.ONE);
        p.setSalePrice(new BigDecimal("2"));
        p.setQuantity(5);
        products.save(p);
        TenantContext.clear();
    }

    private long countProducts(long shopId) {
        Long n = jdbc.queryForObject(
                "SELECT count(*) FROM products WHERE shop_id = ?", Long.class, shopId);
        return n == null ? -1 : n;
    }

    private static String testName(int i) {
        return String.format("YESPOS TEST MAHSULOT %03d", i);
    }

    /** Template-shaped CSV: barcode-less rows, name identity, Umumiy category. */
    private static String testCsv(int rows) {
        StringBuilder sb = new StringBuilder(CSV_HEADER);
        for (int i = 1; i <= rows; i++) {
            sb.append(testName(i)).append(",,,,1.50,2.00,10,Umumiy\n");
        }
        return sb.toString();
    }

    private static MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "ombor-import-TEST-20.csv",
                "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private static String bearer() {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return "Bearer " + Jwts.builder()
                .subject("1")
                .claim("username", "import-tester")
                .claim("role", "ACCOUNT_OWNER")
                .claim("accountId", ACCOUNT)
                .claim("perms", List.of("PRODUCTS:READ", "PRODUCTS:WRITE"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }
}
