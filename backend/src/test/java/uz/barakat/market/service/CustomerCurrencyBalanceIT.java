package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.Customer;
import uz.barakat.market.domain.CustomerTransaction;
import uz.barakat.market.domain.CustomerTxType;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.dto.CustomerResponse;
import uz.barakat.market.dto.PosDtos.CartItem;
import uz.barakat.market.dto.PosDtos.CheckoutRequest;
import uz.barakat.market.repository.CustomerRepository;
import uz.barakat.market.repository.CustomerTransactionRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ShopRepository;

/**
 * Q3 reproduce-then-fix: a customer with a pre-Gate-C USD debt makes a
 * so'm-canonical QARZGA credit purchase. The old single-sum balance merged the
 * two into a meaningless "$63 550"; the per-currency balance keeps them apart
 * ($50 + 63 500 so'm). Both halves asserted here.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:cust_currency_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false"
})
class CustomerCurrencyBalanceIT {

    @Autowired private PosService pos;
    @Autowired private CustomerService customerService;
    @Autowired private CustomerRepository customers;
    @Autowired private CustomerTransactionRepository transactions;
    @Autowired private ProductRepository products;
    @Autowired private ShopRepository shops;

    private long shopId;
    private long customerId;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void qarzgaSomSaleKeepsUsdEraDebtInASeparateBucket() {
        // Shop with a kurs (not needed for a UZS cart, but realistic).
        Shop s = new Shop();
        s.setAccountId(1L);
        s.setName("Q3 shop");
        s.setUsdRate(new BigDecimal("12650"));
        shopId = shops.save(s).getId();
        TenantContext.setShopId(shopId);

        Customer c = new Customer();
        c.setName("Aziz");
        customerId = customers.save(c).getId();

        // Pre-Gate-C debt: a $50 GOODS row (the ledger was USD-canonical then).
        CustomerTransaction old = new CustomerTransaction();
        old.setCustomerId(customerId);
        old.setDate(LocalDate.now().minusDays(30));
        old.setType(CustomerTxType.GOODS);
        old.setAmount(new BigDecimal("50"));
        old.setCurrency(Currency.USD);
        old.setDescription("Eski qarz (USD)");
        transactions.save(old);

        // A so'm product bought on credit for 63 500 so'm.
        Product bread = new Product();
        bread.setName("Guruch qop");
        bread.setPurchasePrice(new BigDecimal("50000"));
        bread.setSalePrice(new BigDecimal("63500"));
        bread.setQuantity(10);
        bread.setCurrency(Currency.UZS);
        long breadId = products.save(bread).getId();

        pos.checkout(new CheckoutRequest(
                List.of(new CartItem(breadId, 1, BigDecimal.ZERO, null)),
                BigDecimal.ZERO, BigDecimal.ZERO, "QARZGA", customerId, null, null), "tester");
        TenantContext.clear();

        // --- REPRODUCE (test-internal arithmetic): the naive single-sum that
        // the old code produced merged the two currencies into a meaningless
        // number. It must no longer be reachable from any live DTO field. ---
        final BigDecimal naiveMerge = new BigDecimal("50").add(new BigDecimal("63500")); // 63550
        assertThat(naiveMerge).isEqualByComparingTo("63550");

        TenantContext.setShopId(shopId);
        CustomerResponse resp = customerService.list().stream()
                .filter(r -> r.id().equals(customerId)).findFirst().orElseThrow();

        // --- FIX: the authoritative balance is split per currency, and NO field
        // reproduces the merged figure (goodsTotal/paidTotal were removed). ---
        assertThat(resp.balanceUsd()).isEqualByComparingTo("50");
        assertThat(resp.balanceUzs()).isEqualByComparingTo("63500");
        assertThat(resp.balanceUzs()).isNotEqualByComparingTo(naiveMerge);
        assertThat(resp.balanceUsd()).isNotEqualByComparingTo(naiveMerge);

        // The new credit row itself is tagged so'm, not left implicit.
        assertThat(transactions.findByCustomerIdOrderByDateDescIdDesc(customerId))
                .filteredOn(t -> t.getDescription() != null
                        && t.getDescription().startsWith("POS qarz sotuvi"))
                .singleElement()
                .satisfies(t -> {
                    assertThat(t.getCurrency()).isEqualTo(Currency.UZS);
                    assertThat(t.getAmount()).isEqualByComparingTo("63500");
                });
    }
}
