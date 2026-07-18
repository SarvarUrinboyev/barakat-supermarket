package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.CostSnapshotProvenance;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Sale;
import uz.barakat.market.domain.SaleItem;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.domain.Supplier;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationResponse;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalRequest;
import uz.barakat.market.repository.ActionLedgerEventRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.PurchaseOrderRepository;
import uz.barakat.market.repository.SaleRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.repository.SupplierRepository;
import uz.barakat.market.service.savdograph.SavdoGraphB2Service;
import uz.barakat.market.service.savdograph.SavdoGraphProposalBridgeService;

/** A ledger persistence failure must roll the bridge proposal back atomically. */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:savdograph_b35_bridge_rollback_it;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=false"
})
class SavdoGraphProposalBridgeRollbackIT {

    private static final AtomicLong IDS = new AtomicLong(111_000L);
    private static final LocalDate DAY = LocalDate.of(2026, 7, 15);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private ShopRepository shops;
    @Autowired private ProductRepository products;
    @Autowired private SupplierRepository suppliers;
    @Autowired private SaleRepository sales;
    @Autowired private PurchaseOrderRepository purchaseOrders;
    @Autowired private SavdoGraphB2Service b2;
    @Autowired private SavdoGraphProposalBridgeService bridge;

    @MockBean private ActionLedgerEventRepository ledger;

    @AfterEach
    void clearContexts() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void ledgerFailureRollsBackProposalAndLeavesEvidenceAndOperationsUntouched() {
        long accountId = IDS.incrementAndGet();
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) VALUES (?, ?, FALSE, now())",
                accountId, "SavdoGraph B3.5 rollback tenant");
        Shop shop = new Shop();
        shop.setAccountId(accountId);
        shop.setName("SavdoGraph B3.5 rollback shop");
        shop.setMain(true);
        shop = shops.save(shop);
        TenantContext.setShopId(shop.getId());

        Product product = new Product();
        product.setName("SavdoGraph B3.5 rollback product");
        product.setBarcode("B35-ROLLBACK-" + IDS.incrementAndGet());
        product.setPurchasePrice(new BigDecimal("4.00"));
        product.setSalePrice(new BigDecimal("10.00"));
        product.setQuantity(2);
        product.setCurrency(Currency.UZS);
        product.setUnit("dona");
        product = products.save(product);
        Supplier supplier = new Supplier();
        supplier.setName("SavdoGraph B3.5 rollback supplier");
        supplier = suppliers.save(supplier);

        Sale sale = new Sale();
        sale.setPaymentMethod("NAQD");
        sale.setCurrency(Currency.UZS);
        sale.setSubtotalUzs(new BigDecimal("140.00"));
        sale.setTotalUzs(new BigDecimal("140.00"));
        sale.setRefundedTotalUzs(BigDecimal.ZERO);
        sale.setCreatedAt(DAY.minusDays(2).atTime(10, 0));
        SaleItem item = new SaleItem();
        item.setProductId(product.getId());
        item.setProductName(product.getName());
        item.setProductSku(product.getBarcode());
        item.setQuantity(14);
        item.setRefundedQty(0);
        item.setUnitPriceUzs(new BigDecimal("10.00"));
        item.setLineTotalUzs(new BigDecimal("140.00"));
        item.setCostAtSaleUzs(new BigDecimal("4.00"));
        item.setCostSnapshotProvenance(CostSnapshotProvenance.TRANSACTION_TIME);
        item.setCurrency(Currency.UZS);
        sale.addItem(item);
        sales.save(sale);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "b35-rollback-owner", null,
                        AuthorityUtils.createAuthorityList("ROLE_ACCOUNT_OWNER", "SAVDOGRAPH:WRITE")));
        ReorderSimulationResponse simulation = b2.runReorderSimulation(new ReorderSimulationRequest(
                product.getId(), DAY.minusDays(7), DAY, 3, 2, 7));
        int evidenceBefore = jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_evidence_item WHERE analysis_run_id = ?",
                Integer.class, simulation.analysisRunId());
        long poBefore = purchaseOrders.count();
        int quantityBefore = product.getQuantity();
        BigDecimal priceBefore = product.getSalePrice();

        when(ledger.save(any())).thenThrow(new IllegalStateException("forced ledger failure"));
        Long supplierId = supplier.getId();
        assertThatThrownBy(() -> bridge.create(
                simulation.analysisRunId(), new CreateReviewProposalRequest(supplierId)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("forced ledger failure");

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_decision_proposal WHERE analysis_run_id = ?",
                Integer.class, simulation.analysisRunId())).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_proposal_evidence WHERE proposal_id IN "
                        + "(SELECT id FROM savdograph_decision_proposal WHERE analysis_run_id = ?)",
                Integer.class, simulation.analysisRunId())).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_evidence_item WHERE analysis_run_id = ?",
                Integer.class, simulation.analysisRunId())).isEqualTo(evidenceBefore);
        assertThat(purchaseOrders.count()).isEqualTo(poBefore);
        assertThat(products.findById(product.getId()).orElseThrow().getQuantity()).isEqualTo(quantityBefore);
        assertThat(products.findById(product.getId()).orElseThrow().getSalePrice())
                .isEqualByComparingTo(priceBefore);
    }
}