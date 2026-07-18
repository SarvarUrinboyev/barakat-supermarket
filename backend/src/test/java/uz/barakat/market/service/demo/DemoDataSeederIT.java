package uz.barakat.market.service.demo;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.ProposalDecisionType;
import uz.barakat.market.dto.AccountingDtos.ProfitLossResponse;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefResponse;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationResponse;
import uz.barakat.market.dto.SavdoGraphDtos.ActionLedgerResponse;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionRequest;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionResponse;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalRequest;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalResponse;
import uz.barakat.market.service.FinancialStatementService;
import uz.barakat.market.service.savdograph.SavdoGraphB2Service;
import uz.barakat.market.service.savdograph.SavdoGraphProposalBridgeService;
import uz.barakat.market.service.savdograph.SavdoGraphService;

/**
 * Drives the real {@link DemoDataSeeder} against an ISOLATED in-memory H2
 * (its own datasource URL, so the shared {@code savdopro_test} DB the other
 * 239 tests rely on is never touched). Verifies the seed:
 * <ul>
 *   <li>creates the reserved demo tenants and the full product catalogue,</li>
 *   <li>produces a real, balanced double-entry ledger that reconciles to an
 *       exact P&L (proving sales actually post accounting), and</li>
 *   <li>is idempotent — a second run adds nothing.</li>
 * </ul>
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:demo_seed_it;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.demo-seed.enabled=false" // we drive seedOnce() by hand; ApplicationRunner stays off
})
class DemoDataSeederIT {

    // Base shop P&L plus B5.1's 12-unit demo sale and one-unit refund:
    //   net added revenue = 11*12000 = 132 000
    //   net added COGS    = 11*9000  =  99 000
    private static final String REVENUE = "463500";
    private static final String COGS = "360300";
    private static final String GROSS = "103200";
    private static final String NET = "58200";
    private static final long CUSTOMER_DEBT = 330_000L; // debtor 250 000 + partial 80 000

    @Autowired private DemoDataSeeder seeder;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private FinancialStatementService statements;
    @Autowired private SavdoGraphB2Service b2;
    @Autowired private SavdoGraphProposalBridgeService bridge;
    @Autowired private SavdoGraphService savdoGraph;

    @AfterEach
    void clear() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void seedsBalancedSavdoGraphJourneyAndIsIdempotent() {
        seeder.seedOnce();

        // --- Reserved tenants only; the B5.1 product is isolated in demo shop A ---
        assertThat(count("SELECT COUNT(*) FROM accounts WHERE id IN (90001, 90002)")).isEqualTo(2);
        assertThat(count("SELECT COUNT(*) FROM shops WHERE id IN (90101, 90102, 90201)")).isEqualTo(3);
        assertThat(count("SELECT COUNT(*) FROM products WHERE shop_id = 90101")).isEqualTo(21);
        assertThat(count("SELECT COUNT(*) FROM products WHERE shop_id = 90201")).isEqualTo(5);
        assertThat(count("SELECT COUNT(*) FROM products WHERE shop_id NOT IN (90101, 90102, 90201)")).isZero();

        // --- Contact-free supplier and exactly one visible, provenance-valid refund ---
        assertThat(count("SELECT COUNT(*) FROM suppliers WHERE shop_id = 90101 "
                + "AND name = 'Demo Supplier' AND phone IS NULL AND address IS NULL AND note IS NULL")).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM sales WHERE shop_id = 90101 "
                + "AND client_ref = 'demo-savdograph-b5-1-v1' AND refunded_total_uzs = 12000")).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM sale_items si JOIN sales s ON s.id = si.sale_id "
                + "WHERE s.shop_id = 90101 AND s.client_ref = 'demo-savdograph-b5-1-v1' "
                + "AND si.quantity = 12 AND si.refunded_qty = 1 AND si.cost_at_sale_uzs = 9000 "
                + "AND si.cost_snapshot_provenance = 'TRANSACTION_TIME'")).isEqualTo(1);

        // --- Real POS/refund accounting reconciles to the deterministic P&L ---
        TenantContext.setShopId(90101L);
        ProfitLossResponse pnl = statements.profitLoss(LocalDate.now().withDayOfMonth(1), LocalDate.now());
        assertThat(pnl.revenueTotal()).isEqualByComparingTo(REVENUE);
        assertThat(pnl.cogsTotal()).isEqualByComparingTo(COGS);
        assertThat(pnl.grossProfit()).isEqualByComparingTo(GROSS);
        assertThat(pnl.netProfit()).isEqualByComparingTo(NET);

        // --- B2 brief + eligible simulation use only the canonical seeded records ---
        authenticateDemoOwner();
        LocalDate periodEnd = LocalDate.now().plusDays(1);
        GrossProfitBriefResponse brief = b2.generateGrossProfitBrief(
                new GrossProfitBriefRequest(LocalDate.now(), periodEnd));
        assertThat(brief.classification().name()).isEqualTo("VERIFIED");
        assertThat(brief.refundedAmountUzs()).isEqualByComparingTo("12000");
        assertThat(brief.revenueUzs()).isEqualByComparingTo(REVENUE);
        assertThat(brief.cogsUzs()).isEqualByComparingTo(COGS);

        Long productId = jdbc.queryForObject(
                "SELECT id FROM products WHERE shop_id = 90101 AND barcode = '4780001090001'", Long.class);
        Long supplierId = jdbc.queryForObject(
                "SELECT id FROM suppliers WHERE shop_id = 90101 AND name = 'Demo Supplier'", Long.class);
        ReorderSimulationRequest scenario = new ReorderSimulationRequest(
                productId, periodEnd.minusDays(30), periodEnd, 2, 3, 7);
        ReorderSimulationResponse simulation = b2.runReorderSimulation(scenario);
        assertThat(simulation.classification().name()).isEqualTo("ESTIMATED");
        assertThat(simulation.currentOnHandQuantity()).isEqualTo(4);
        assertThat(simulation.netUnitsSold()).isEqualByComparingTo("11");
        assertThat(simulation.reorderQuantity()).isEqualTo(1);

        // --- Pending review -> owner approval -> exactly one DRAFT; retry is idempotent ---
        CreateReviewProposalResponse approvedProposal = bridge.create(
                simulation.analysisRunId(), new CreateReviewProposalRequest(supplierId));
        assertThat(approvedProposal.proposalStatus().name()).isEqualTo("PROPOSED");
        DecisionRequest approval = new DecisionRequest("Demo owner approval", "demo-b5-1-approve-v1");
        DecisionResponse approved = savdoGraph.decide(
                approvedProposal.proposalId(), ProposalDecisionType.APPROVE, approval);
        DecisionResponse replayed = savdoGraph.decide(
                approvedProposal.proposalId(), ProposalDecisionType.APPROVE, approval);
        assertThat(approved.proposalStatus().name()).isEqualTo("DRAFT_CREATED");
        assertThat(replayed.idempotent()).isTrue();
        assertThat(replayed.purchaseOrderId()).isEqualTo(approved.purchaseOrderId());
        assertThat(count("SELECT COUNT(*) FROM purchase_order WHERE shop_id = 90101 AND status = 'DRAFT'")).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM purchase_order WHERE shop_id = 90101 AND status <> 'DRAFT'")).isZero();

        // --- Separate canonical proposal can be rejected without another PO ---
        ReorderSimulationResponse rejectedSimulation = b2.runReorderSimulation(scenario);
        CreateReviewProposalResponse rejectedProposal = bridge.create(
                rejectedSimulation.analysisRunId(), new CreateReviewProposalRequest(supplierId));
        DecisionResponse rejected = savdoGraph.decide(
                rejectedProposal.proposalId(), ProposalDecisionType.REJECT,
                new DecisionRequest("Demo owner rejection", "demo-b5-1-reject-v1"));
        assertThat(rejected.proposalStatus().name()).isEqualTo("REJECTED");
        assertThat(rejected.purchaseOrderId()).isNull();
        assertThat(count("SELECT COUNT(*) FROM purchase_order WHERE shop_id = 90101")).isEqualTo(1);

        // --- Immutable action ledger is append-only and reads do not mutate it ---
        List<ActionLedgerResponse> ledger = savdoGraph.listLedger();
        assertThat(ledger).extracting(ActionLedgerResponse::eventType)
                .contains("PROPOSAL_APPROVED", "DRAFT_PURCHASE_ORDER_CREATED", "PROPOSAL_REJECTED");
        long ledgerRows = count("SELECT COUNT(*) FROM savdograph_action_ledger_event WHERE shop_id = 90101");
        assertThat(ledgerRows).isEqualTo(ledger.size());
        assertThat(savdoGraph.listLedger()).hasSize(ledger.size());

        // --- Existing customer debt proof remains deterministic ---
        Long debt = jdbc.queryForObject(
                "SELECT COALESCE(SUM(CASE WHEN type = 'GOODS' THEN amount ELSE -amount END), 0) "
                + "FROM customer_transactions WHERE shop_id = 90101", Long.class);
        assertThat(debt).isEqualTo(CUSTOMER_DEBT);

        // --- Re-running the seed cannot duplicate or mutate the B5.1 artifact ---
        long shopsBefore = count("SELECT COUNT(*) FROM shops");
        long productsBefore = count("SELECT COUNT(*) FROM products");
        long salesBefore = count("SELECT COUNT(*) FROM sales");
        long suppliersBefore = count("SELECT COUNT(*) FROM suppliers");
        long refundsBefore = count("SELECT COUNT(*) FROM sale_items WHERE refunded_qty > 0");
        seeder.seedOnce();
        assertThat(count("SELECT COUNT(*) FROM shops")).isEqualTo(shopsBefore);
        assertThat(count("SELECT COUNT(*) FROM products")).isEqualTo(productsBefore);
        assertThat(count("SELECT COUNT(*) FROM sales")).isEqualTo(salesBefore);
        assertThat(count("SELECT COUNT(*) FROM suppliers")).isEqualTo(suppliersBefore);
        assertThat(count("SELECT COUNT(*) FROM sale_items WHERE refunded_qty > 0")).isEqualTo(refundsBefore);
        assertThat(count("SELECT COUNT(*) FROM purchase_order WHERE shop_id = 90101")).isEqualTo(1);
    }

    private static void authenticateDemoOwner() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "demo-owner", null, AuthorityUtils.createAuthorityList("ROLE_ACCOUNT_OWNER")));
    }

    private long count(String sql) {
        Long n = jdbc.queryForObject(sql, Long.class);
        return n == null ? 0 : n;
    }
}
