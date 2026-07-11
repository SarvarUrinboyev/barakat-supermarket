package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.Customer;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.dto.PosDtos.CartItem;
import uz.barakat.market.dto.PosDtos.CheckoutRequest;
import uz.barakat.market.dto.PosDtos.SaleResponse;
import uz.barakat.market.repository.CustomerRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ShopRepository;

/**
 * FIX-1 — rehearses the ops runbook's EXT-1 relabel SQL (docs/ops/
 * gate-c-p1-cleanup.md §3b) against real seeded data, so the SQL that first
 * runs on deploy night is not an untested artifact. Three row classes:
 *   (a) a USD-era manual row              -> stays USD (not a credit-sale row)
 *   (b) a credit sale of only UZS goods   -> relabeled UZS
 *   (c) a credit sale with a USD line     -> WORKLIST, never guessed (a mixed
 *       cart's total is a so'm+USD blend; neither label is honest)
 * The relabel and the worklist are exact complements over the candidate set.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:cust_relabel_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false"
})
class CustomerLedgerRelabelIT {

    /** Verbatim from the runbook EXT-1 §3b — keep in sync. */
    private static final String RELABEL = """
            UPDATE customer_transactions ct SET currency = 'UZS'
            WHERE ct.description LIKE 'POS qarz sotuvi #%'
              AND ct.created_at >= DATE '2026-07-11'
              AND ct.currency = 'USD'
              AND EXISTS (
                    SELECT 1 FROM sales s
                    WHERE s.id = CAST(regexp_replace(ct.description, '[^0-9]', '', 'g') AS BIGINT)
                      AND s.currency = 'UZS'
                      AND NOT EXISTS (SELECT 1 FROM sale_items si
                                      WHERE si.sale_id = s.id AND si.currency = 'USD'))""";

    private static final String WORKLIST = """
            SELECT ct.id FROM customer_transactions ct
            WHERE ct.description LIKE 'POS qarz sotuvi #%'
              AND ct.created_at >= DATE '2026-07-11'
              AND ct.currency = 'USD'
              AND NOT EXISTS (
                    SELECT 1 FROM sales s
                    WHERE s.id = CAST(regexp_replace(ct.description, '[^0-9]', '', 'g') AS BIGINT)
                      AND s.currency = 'UZS'
                      AND NOT EXISTS (SELECT 1 FROM sale_items si
                                      WHERE si.sale_id = s.id AND si.currency = 'USD'))""";

    @Autowired private PosService pos;
    @Autowired private ProductRepository products;
    @Autowired private ShopRepository shops;
    @Autowired private CustomerRepository customers;
    @Autowired private JdbcTemplate jdbc;

    private long shopId;
    private long customerId;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private Product product(String name, long sale, Currency currency) {
        Product p = new Product();
        p.setName(name);
        p.setPurchasePrice(BigDecimal.valueOf(sale - 100));
        p.setSalePrice(BigDecimal.valueOf(sale));
        p.setQuantity(100);
        p.setCurrency(currency);
        return products.save(p);
    }

    /** The credit-sale ledger row auto-created for a QARZGA sale. */
    private long creditTxId(long saleId) {
        return jdbc.queryForObject(
                "SELECT id FROM customer_transactions WHERE description = ?",
                Long.class, "POS qarz sotuvi #" + saleId);
    }

    /** Simulate the OLD code's row: currency mis-backfilled USD, post-import date. */
    private void ageAsUsd(long txId) {
        jdbc.update("UPDATE customer_transactions SET currency = 'USD', "
                + "created_at = TIMESTAMP '2026-07-15 10:00:00' WHERE id = ?", txId);
    }

    private String currencyOf(long txId) {
        return jdbc.queryForObject(
                "SELECT currency FROM customer_transactions WHERE id = ?", String.class, txId);
    }

    private SaleResponse creditSale(CartItem... items) {
        return pos.checkout(new CheckoutRequest(List.of(items),
                BigDecimal.ZERO, BigDecimal.ZERO, "QARZGA", customerId, null, null), "tester");
    }

    @Test
    void relabelsPureSomCreditSalesAndWorklistsMixedOnes() {
        Shop s = new Shop();
        s.setAccountId(1L);
        s.setName("Relabel shop");
        s.setUsdRate(new BigDecimal("12000"));
        shopId = shops.save(s).getId();
        TenantContext.setShopId(shopId);

        Customer c = new Customer();
        c.setName("Relabel customer");
        customerId = customers.save(c).getId();

        Product som = product("Guruch", 63500, Currency.UZS);
        Product somB = product("Non", 5000, Currency.UZS);
        Product dollar = product("Smartfon", 1350, Currency.USD);

        // (b) pure-so'm credit sale.
        SaleResponse b = creditSale(new CartItem(som.getId(), 1, BigDecimal.ZERO, null));
        long txB = creditTxId(b.id());
        ageAsUsd(txB);

        // (c) mixed credit sale (a so'm line + a USD line).
        SaleResponse cc = creditSale(
                new CartItem(somB.getId(), 1, BigDecimal.ZERO, null),
                new CartItem(dollar.getId(), 1, BigDecimal.ZERO, null));
        long txC = creditTxId(cc.id());
        ageAsUsd(txC);

        // (a) a USD-era manual (non-credit-sale) row — must be untouched.
        jdbc.update("INSERT INTO customer_transactions "
                + "(shop_id, customer_id, date, type, amount, currency, description, created_at) "
                + "VALUES (?, ?, DATE '2026-06-01', 'GOODS', 50, 'USD', 'Eski qarz (USD)', "
                + "TIMESTAMP '2026-06-01 10:00:00')", shopId, customerId);
        Long txA = jdbc.queryForObject(
                "SELECT id FROM customer_transactions WHERE description = 'Eski qarz (USD)'", Long.class);
        TenantContext.clear();

        // --- run the runbook's exact relabel, then its worklist ---
        int relabeled = jdbc.update(RELABEL);
        List<Long> worklist = jdbc.queryForList(WORKLIST, Long.class);

        assertThat(relabeled).isEqualTo(1);              // only (b)
        assertThat(currencyOf(txB)).isEqualTo("UZS");    // (b) corrected
        assertThat(currencyOf(txC)).isEqualTo("USD");    // (c) left, not guessed
        assertThat(worklist).containsExactly(txC);       // (c) surfaced
        assertThat(currencyOf(txA)).isEqualTo("USD");    // (a) manual row untouched
        assertThat(worklist).doesNotContain(txA);
    }
}
