package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.DecisionProposal;
import uz.barakat.market.domain.DecisionProposalStatus;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.domain.Supplier;
import uz.barakat.market.dto.SavdoGraphDtos.AnalysisRunRequest;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionRequest;
import uz.barakat.market.dto.SavdoGraphDtos.ProposalRequest;
import uz.barakat.market.dto.SavdoGraphDtos.ReorderEvidenceRequest;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.repository.ActionLedgerEventRepository;
import uz.barakat.market.repository.DecisionProposalRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ProposalDecisionRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.repository.SupplierRepository;
import uz.barakat.market.service.PurchaseOrderService;
import uz.barakat.market.service.savdograph.SavdoGraphService;

/** A downstream PO failure must leave no final decision, PO result, or success ledger event. */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:savdograph_b1_rollback_it;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=false"
})
class SavdoGraphTransactionRollbackIT {

    @Autowired private SavdoGraphService service;
    @Autowired private ShopRepository shops;
    @Autowired private ProductRepository products;
    @Autowired private SupplierRepository suppliers;
    @Autowired private DecisionProposalRepository proposals;
    @Autowired private ProposalDecisionRepository decisions;
    @Autowired private ActionLedgerEventRepository ledger;

    @MockBean private PurchaseOrderService purchaseOrders;

    private long shopId;
    private long productId;
    private long supplierId;

    @BeforeEach
    void setup() {
        Shop shop = new Shop();
        shop.setAccountId(1L);
        shop.setName("SavdoGraph rollback shop");
        shop.setMain(true);
        shop = shops.save(shop);
        shopId = shop.getId();
        TenantContext.setShopId(shopId);

        Product product = new Product();
        product.setName("SavdoGraph rollback product");
        product.setPurchasePrice(BigDecimal.ONE);
        product.setSalePrice(BigDecimal.TEN);
        product.setQuantity(1);
        product.setLowStockThreshold(5);
        product.setCurrency(Currency.UZS);
        product = products.save(product);
        productId = product.getId();
        Supplier supplier = new Supplier();
        supplier.setName("SavdoGraph rollback supplier");
        supplier = suppliers.save(supplier);
        supplierId = supplier.getId();

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "rollback-owner", null, AuthorityUtils.createAuthorityList("ROLE_ACCOUNT_OWNER")));
    }

    @AfterEach
    void clear() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void purchaseOrderFailureRollsBackTheDecisionAndSuccessLedger() {
        long runId = service.createAnalysisRun(new AnalysisRunRequest(
                "REORDER_LOW_STOCK", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 18))).id();
        long evidenceId = service.createReorderEvidence(new ReorderEvidenceRequest(runId, productId)).id();
        long proposalId = service.createProposal(new ProposalRequest(runId, supplierId, List.of(evidenceId))).id();

        when(purchaseOrders.create(any())).thenThrow(new BadRequestException("forced PO failure"));

        assertThatThrownBy(() -> service.decide(proposalId, uz.barakat.market.domain.ProposalDecisionType.APPROVE,
                new DecisionRequest("rollback proof", "rollback-1")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("forced PO failure");

        DecisionProposal proposal = proposals.findById(proposalId).orElseThrow();
        assertThat(proposal.getStatus()).isEqualTo(DecisionProposalStatus.PROPOSED);
        assertThat(decisions.findByProposalId(proposalId)).isEmpty();
        assertThat(ledger.findAllByOrderByIdDesc()).noneMatch(event -> proposalId == event.getProposalId()
                && ("PROPOSAL_APPROVED".equals(event.getEventType())
                || "DRAFT_PURCHASE_ORDER_CREATED".equals(event.getEventType())));
    }
}
