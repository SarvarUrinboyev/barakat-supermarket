package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ShopRepository;

/**
 * Regression guard for the "AI har savolga 'topilmadi' deydi" bug: AiToolService
 * ran WITHOUT a transaction, so (open-in-view=false) every repository call got
 * its own session where the TenantFilterAspect had never enabled the Hibernate
 * tenant filter — unscoped rows came back and the TenantScopedEntity @PostLoad
 * guard (rightly) blew up with NotFoundException, which the agent loop showed
 * as "ma'lumot topilmadi". With @Transactional(readOnly=true) on the tool
 * layer the filter binds to the tool call's own session, so filter-reliant
 * tools work AND stay tenant-isolated.
 */
@SpringBootTest
@ActiveProfiles("test")
class AiToolServiceTenantIT {

    @Autowired AiToolService tools;
    @Autowired ProductRepository products;
    @Autowired ShopRepository shops;

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    private Product createProduct(Long shopId, String name, int qty) {
        TenantContext.setShopId(shopId);
        Product p = new Product();
        p.setName(name);
        p.setPurchasePrice(BigDecimal.ONE);
        p.setSalePrice(new BigDecimal("2"));
        p.setQuantity(qty);
        Product saved = products.save(p);
        TenantContext.clear();
        return saved;
    }

    @Test
    void inventoryValueWorksAndSeesOnlyTheActiveShop() {
        Shop shopA = shops.findAll().stream().findFirst().orElseThrow();
        // A second real shop on the same account, holding a decoy product.
        Shop shopB = new Shop();
        shopB.setName("AI isolation B");
        shopB.setAccountId(shopA.getAccountId());
        shopB = shops.save(shopB);

        createProduct(shopA.getId(), "AI vidjet A", 7);
        createProduct(shopB.getId(), "AI dekoy B", 999);

        TenantContext.setShopId(shopA.getId());
        String out = tools.call("inventoryValue", Map.of());

        // The old bug surfaced here as "XATO: 'inventoryValue' bajarilmadi
        // (Ma'lumot topilmadi)" — the @PostLoad guard killing an unscoped read.
        assertThat(out).doesNotContain("XATO");
        assertThat(out).contains("xil mahsulot");
        // Isolation: shop B's 999 decoy units must not inflate shop A's total.
        assertThat(out).doesNotContain("999");
    }

    @Test
    void productInfoIsTenantScoped() {
        Shop shopA = shops.findAll().stream().findFirst().orElseThrow();
        Shop shopB = new Shop();
        shopB.setName("AI isolation B2");
        shopB.setAccountId(shopA.getAccountId());
        shopB = shops.save(shopB);
        createProduct(shopB.getId(), "Yashirin mahsulot B2", 5);

        TenantContext.setShopId(shopA.getId());
        String out = tools.call("productInfo", Map.of("name", "Yashirin mahsulot B2"));

        // Not an error — a clean "not found" for a row outside the scope.
        assertThat(out).doesNotContain("XATO");
        assertThat(out).contains("topilmadi");
    }
}
