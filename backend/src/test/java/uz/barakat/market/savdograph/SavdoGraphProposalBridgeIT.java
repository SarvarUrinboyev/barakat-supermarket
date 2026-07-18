package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.CostSnapshotProvenance;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.DecisionProposal;
import uz.barakat.market.domain.DecisionProposalStatus;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.PurchaseOrder;
import uz.barakat.market.domain.PurchaseOrderStatus;
import uz.barakat.market.domain.Sale;
import uz.barakat.market.domain.SaleItem;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.domain.Supplier;
import uz.barakat.market.repository.DecisionProposalRepository;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.PurchaseOrderRepository;
import uz.barakat.market.repository.SaleRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.repository.StockMovementRepository;
import uz.barakat.market.repository.SupplierRepository;
import uz.barakat.market.service.savdograph.EvidenceContentHasher;
import uz.barakat.market.service.savdograph.SavdoGraphProposalBridgeService;

/** Persistence, tenancy, integrity, idempotency and no-side-effect proof for B3.5. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:savdograph_b35_bridge_it;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=false"
})
class SavdoGraphProposalBridgeIT {

    private static final String SECRET = "test-only-jwt-secret-not-for-production-0123456789abcdef";
    private static final AtomicLong IDS = new AtomicLong(101_000L);
    private static final LocalDate DAY = LocalDate.of(2026, 7, 15);

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private ShopRepository shops;
    @Autowired private ProductRepository products;
    @Autowired private SupplierRepository suppliers;
    @Autowired private SaleRepository sales;
    @Autowired private EvidenceItemRepository evidenceItems;
    @Autowired private DecisionProposalRepository proposals;
    @Autowired private PurchaseOrderRepository purchaseOrders;
    @Autowired private StockMovementRepository stockMovements;

    private Fixture a;
    private Fixture b;
    private String ownerA;
    private String ownerB;

    @BeforeEach
    void seedTenants() {
        a = seed("A", 2);
        b = seed("B", 4);
        ownerA = bearer(a.accountId(), "SAVDOGRAPH:READ", "SAVDOGRAPH:WRITE",
                "SAVDOGRAPH:DECIDE", "SAVDOGRAPH_LEDGER:READ");
        ownerB = bearer(b.accountId(), "SAVDOGRAPH:READ", "SAVDOGRAPH:WRITE",
                "SAVDOGRAPH:DECIDE", "SAVDOGRAPH_LEDGER:READ");
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void validSimulationCreatesOnePendingProposalWithExactEvidenceAndNoOperationalSideEffect() throws Exception {
        long runId = positiveSimulation(a, ownerA);
        JsonNode simulation = getSimulationResponse(runId);
        Set<Long> expectedEvidence = values(simulation.path("evidenceIds"));
        int quantityBefore = product(a).getQuantity();
        BigDecimal priceBefore = product(a).getSalePrice();
        long poBefore = purchaseOrders.count();
        long movementsBefore = stockMovements.count();

        JsonNode response = body(bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 201));
        assertThat(response.path("proposalStatus").asText()).isEqualTo("PROPOSED");
        assertThat(response.path("sourceKind").asText())
                .isEqualTo(SavdoGraphProposalBridgeService.SOURCE_KIND);
        assertThat(response.path("sourceAnalysisRunId").asLong()).isEqualTo(runId);
        assertThat(response.path("productId").asLong()).isEqualTo(a.product().getId());
        assertThat(response.path("supplierId").asLong()).isEqualTo(a.supplier().getId());
        assertThat(response.path("reorderQuantity").asInt()).isPositive();
        assertThat(response.path("classification").asText()).isEqualTo("ESTIMATED");
        assertThat(response.path("assumptions")).isNotEmpty();
        assertThat(response.path("risks")).isNotEmpty();
        assertThat(response.path("limitations")).isNotEmpty();
        assertThat(values(response.path("evidenceIds"))).isEqualTo(expectedEvidence);
        assertThat(response.path("idempotent").asBoolean()).isFalse();

        TenantContext.setShopId(a.shopId());
        DecisionProposal proposal = proposals.findById(response.path("proposalId").asLong()).orElseThrow();
        assertThat(proposal.getStatus()).isEqualTo(DecisionProposalStatus.PROPOSED);
        assertThat(proposal.getSourceKind()).isEqualTo(SavdoGraphProposalBridgeService.SOURCE_KIND);
        assertThat(proposal.getAnalysisRunId()).isEqualTo(runId);
        assertThat(new HashSet<>(proposal.getEvidenceItems().stream().map(EvidenceItem::getId).toList()))
                .isEqualTo(expectedEvidence);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_action_ledger_event WHERE shop_id = ? AND proposal_id = ? AND event_type = ?",
                Integer.class, a.shopId(), proposal.getId(), SavdoGraphProposalBridgeService.LEDGER_EVENT)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_action_ledger_event WHERE shop_id = ? AND proposal_id = ? AND purchase_order_id IS NOT NULL",
                Integer.class, a.shopId(), proposal.getId())).isZero();
        TenantContext.clear();

        assertThat(purchaseOrders.count()).isEqualTo(poBefore);
        assertThat(stockMovements.count()).isEqualTo(movementsBefore);
        assertThat(product(a).getQuantity()).isEqualTo(quantityBefore);
        assertThat(product(a).getSalePrice()).isEqualByComparingTo(priceBefore);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '46' AND success = TRUE",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void equivalentReplayReturnsOneProposalWithoutDuplicateLedgerAndDifferentSupplierConflicts() throws Exception {
        long runId = positiveSimulation(a, ownerA);
        JsonNode first = body(bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 201));
        JsonNode replay = body(bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 200));
        assertThat(replay.path("proposalId").asLong()).isEqualTo(first.path("proposalId").asLong());
        assertThat(replay.path("idempotent").asBoolean()).isTrue();

        TenantContext.setShopId(a.shopId());
        Supplier other = supplier("Other " + IDS.incrementAndGet());
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_decision_proposal WHERE shop_id = ? AND analysis_run_id = ? AND source_kind = ?",
                Integer.class, a.shopId(), runId, SavdoGraphProposalBridgeService.SOURCE_KIND)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_action_ledger_event WHERE shop_id = ? AND proposal_id = ? AND event_type = ?",
                Integer.class, a.shopId(), first.path("proposalId").asLong(),
                SavdoGraphProposalBridgeService.LEDGER_EVENT)).isEqualTo(1);
        TenantContext.clear();

        bridge(runId, other.getId(), ownerA, a.shopId(), 409);
    }

    @Test
    void requestAcceptsOnlyNumericSupplierIdAndWritePermissionIsEnforced() throws Exception {
        long runId = positiveSimulation(a, ownerA);
        mvc.perform(post("/api/savdograph/reorder-simulations/{id}/proposals", runId)
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"supplierId\":" + a.supplier().getId()
                                + ",\"productId\":1,\"shopId\":1,\"tenantId\":1}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/savdograph/reorder-simulations/{id}/proposals", runId)
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/savdograph/reorder-simulations/{id}/proposals", runId)
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"supplierId\":\"UUID\"}"))
                .andExpect(status().isBadRequest());

        String readOnly = bearer(a.accountId(), "SAVDOGRAPH:READ");
        mvc.perform(post("/api/savdograph/reorder-simulations/{id}/proposals", runId)
                        .header("Authorization", readOnly).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("supplierId", a.supplier().getId()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void crossTenantRunSupplierAndProductAreSafelyRejected() throws Exception {
        long runB = positiveSimulation(b, ownerB);
        bridge(runB, a.supplier().getId(), ownerA, a.shopId(), 404);

        long runA = positiveSimulation(a, ownerA);
        bridge(runA, b.supplier().getId(), ownerA, a.shopId(), 404);

        EvidenceItem quantity = evidence(runA, a, EvidenceType.REORDER_QUANTITY);
        quantity.setProductId(b.product().getId());
        rewriteEvidence(quantity);
        bridge(runA, a.supplier().getId(), ownerA, a.shopId(), 400);

        long foreignEvidenceRunA = positiveSimulation(a, ownerA);
        long foreignEvidenceRunB = positiveSimulation(b, ownerB);
        EvidenceItem localVelocity = evidence(foreignEvidenceRunA, a, EvidenceType.REORDER_VELOCITY);
        jdbc.update("DELETE FROM savdograph_evidence_item WHERE id = ?", localVelocity.getId());
        EvidenceItem foreignVelocity = evidence(foreignEvidenceRunB, b, EvidenceType.REORDER_VELOCITY);
        foreignVelocity.setAnalysisRunId(foreignEvidenceRunA);
        rewriteEvidence(foreignVelocity);
        bridge(foreignEvidenceRunA, a.supplier().getId(), ownerA, a.shopId(), 400);
    }

    @Test
    void wrongRunMissingSupplierAndTamperedRunSnapshotAreRejected() throws Exception {
        JsonNode brief = body(mvc.perform(post("/api/savdograph/gross-profit-briefs")
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "periodStart", DAY.minusDays(7), "periodEnd", DAY))))
                .andExpect(status().isCreated()).andReturn());
        bridge(brief.path("analysisRunId").asLong(), a.supplier().getId(), ownerA, a.shopId(), 400);
        bridge(9_999_999L, a.supplier().getId(), ownerA, a.shopId(), 404);

        long runId = positiveSimulation(a, ownerA);
        bridge(runId, 9_999_999L, ownerA, a.shopId(), 404);
        jdbc.update("UPDATE savdograph_analysis_run SET input_hash = ? WHERE id = ?",
                "0".repeat(64), runId);
        entityManager.clear();
        bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 400);
    }

    @Test
    void insufficientUnsupportedAndZeroQuantitySimulationsAreRejected() throws Exception {
        long zeroRun = simulation(a, ownerA);
        bridge(zeroRun, a.supplier().getId(), ownerA, a.shopId(), 400);

        Fixture invalid = seed("INVALID", -1);
        String invalidOwner = bearer(invalid.accountId(), "SAVDOGRAPH:READ", "SAVDOGRAPH:WRITE");
        long insufficientRun = simulation(invalid, invalidOwner);
        bridge(insufficientRun, invalid.supplier().getId(), invalidOwner, invalid.shopId(), 400);

        long unsupportedRun = positiveSimulation(a, ownerA);
        EvidenceItem classification = evidence(unsupportedRun, a, EvidenceType.RESULT_CLASSIFICATION);
        ObjectNode classificationData = (ObjectNode) json.readTree(classification.getInputData());
        classificationData.put("classification", "UNSUPPORTED");
        ((ObjectNode) classificationData.path("snapshot")).put("classification", "UNSUPPORTED");
        classification.setInputData(json.writeValueAsString(classificationData));
        rewriteEvidence(classification);
        bridge(unsupportedRun, a.supplier().getId(), ownerA, a.shopId(), 400);

        long verifiedRun = positiveSimulation(a, ownerA);
        EvidenceItem verified = evidence(verifiedRun, a, EvidenceType.RESULT_CLASSIFICATION);
        ObjectNode verifiedData = (ObjectNode) json.readTree(verified.getInputData());
        verifiedData.put("classification", "VERIFIED");
        ((ObjectNode) verifiedData.path("snapshot")).put("classification", "VERIFIED");
        verified.setInputData(json.writeValueAsString(verifiedData));
        rewriteEvidence(verified);
        bridge(verifiedRun, a.supplier().getId(), ownerA, a.shopId(), 400);
    }

    @Test
    void missingDuplicateLegacyAndTamperedEvidenceAreRejected() throws Exception {
        long missingRun = positiveSimulation(a, ownerA);
        EvidenceItem missing = evidence(missingRun, a, EvidenceType.RESULT_CLASSIFICATION);
        jdbc.update("DELETE FROM savdograph_evidence_item WHERE id = ?", missing.getId());
        entityManager.clear();
        bridge(missingRun, a.supplier().getId(), ownerA, a.shopId(), 400);

        long missingQuantityRun = positiveSimulation(a, ownerA);
        EvidenceItem missingQuantity = evidence(missingQuantityRun, a, EvidenceType.REORDER_QUANTITY);
        jdbc.update("DELETE FROM savdograph_evidence_item WHERE id = ?", missingQuantity.getId());
        entityManager.clear();
        bridge(missingQuantityRun, a.supplier().getId(), ownerA, a.shopId(), 400);

        long duplicateRun = positiveSimulation(a, ownerA);
        EvidenceItem original = evidence(duplicateRun, a, EvidenceType.RESULT_CLASSIFICATION);
        EvidenceItem duplicate = copy(original);
        duplicate.setInputData(original.getInputData() + " ");
        duplicate.setContentHash(EvidenceContentHasher.hash(duplicate));
        TenantContext.setShopId(a.shopId());
        evidenceItems.save(duplicate);
        TenantContext.clear();
        bridge(duplicateRun, a.supplier().getId(), ownerA, a.shopId(), 400);

        long legacyRun = positiveSimulation(a, ownerA);
        EvidenceItem legacy = evidence(legacyRun, a, EvidenceType.REORDER_CURRENT_STOCK);
        assertThatThrownBy(() -> jdbc.update(
                "UPDATE savdograph_evidence_item SET hash_version = 'LEGACY' WHERE id = ?", legacy.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);

        long tamperedRun = positiveSimulation(a, ownerA);
        EvidenceItem tampered = evidence(tamperedRun, a, EvidenceType.REORDER_VELOCITY);
        jdbc.update("UPDATE savdograph_evidence_item SET content_hash = ? WHERE id = ?",
                "f".repeat(64), tampered.getId());
        entityManager.clear();
        bridge(tamperedRun, a.supplier().getId(), ownerA, a.shopId(), 400);
    }

    @Test
    void zeroNegativeFractionalAndOutOfBoundCanonicalQuantitiesAreRejected() throws Exception {
        for (String invalid : List.of("0", "-1", "1.5", "100001")) {
            long runId = positiveSimulation(a, ownerA);
            EvidenceItem quantity = evidence(runId, a, EvidenceType.REORDER_QUANTITY);
            quantity.setCalculatedResult(new BigDecimal(invalid));
            rewriteEvidence(quantity);
            bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 400);
        }
    }

    @Test
    void crossRunEvidenceConflictAndCrossUnitChangeAreRejected() throws Exception {
        long firstRun = positiveSimulation(a, ownerA);
        long secondRun = positiveSimulation(a, ownerA);
        EvidenceItem secondQuantity = evidence(secondRun, a, EvidenceType.REORDER_QUANTITY);
        EvidenceItem injected = copy(secondQuantity);
        injected.setAnalysisRunId(firstRun);
        injected.setContentHash(EvidenceContentHasher.hash(injected));
        TenantContext.setShopId(a.shopId());
        evidenceItems.save(injected);
        TenantContext.clear();
        bridge(firstRun, a.supplier().getId(), ownerA, a.shopId(), 400);

        long unitRun = positiveSimulation(a, ownerA);
        TenantContext.setShopId(a.shopId());
        Product changed = products.findById(a.product().getId()).orElseThrow();
        changed.setUnit("kg");
        products.save(changed);
        TenantContext.clear();
        bridge(unitRun, a.supplier().getId(), ownerA, a.shopId(), 400);
    }

    @Test
    void concurrentEquivalentRequestsCreateAtMostOneProposalAndOneSuccessLedger() throws Exception {
        long runId = positiveSimulation(a, ownerA);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        long proposalId;
        try {
            List<Future<MvcResult>> futures = new ArrayList<>();
            for (int index = 0; index < 2; index++) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    return mvc.perform(post("/api/savdograph/reorder-simulations/{id}/proposals", runId)
                                    .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(json.writeValueAsString(
                                            Map.of("supplierId", a.supplier().getId()))))
                            .andReturn();
                }));
            }
            ready.await();
            start.countDown();
            MvcResult left = futures.get(0).get();
            MvcResult right = futures.get(1).get();
            assertThat(Set.of(left.getResponse().getStatus(), right.getResponse().getStatus()))
                    .isEqualTo(Set.of(200, 201));
            proposalId = body(left).path("proposalId").asLong();
            assertThat(proposalId).isEqualTo(body(right).path("proposalId").asLong());
        } finally {
            pool.shutdownNow();
        }

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_decision_proposal WHERE shop_id = ? AND analysis_run_id = ? AND source_kind = ?",
                Integer.class, a.shopId(), runId, SavdoGraphProposalBridgeService.SOURCE_KIND)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM savdograph_action_ledger_event WHERE shop_id = ? AND proposal_id = ? AND event_type = ?",
                Integer.class, a.shopId(), proposalId, SavdoGraphProposalBridgeService.LEDGER_EVENT)).isEqualTo(1);
    }

    @Test
    void bridgedProposalRetainsOwnerOnlyIdempotentDraftApprovalContract() throws Exception {
        long runId = positiveSimulation(a, ownerA);
        JsonNode proposal = body(bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 201));
        long proposalId = proposal.path("proposalId").asLong();
        long poBefore = purchaseOrders.count();

        JsonNode approved = body(mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposalId)
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("reason", "human review complete", "idempotencyKey", "b35-approve-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proposalStatus").value("DRAFT_CREATED"))
                .andExpect(jsonPath("$.idempotent").value(false))
                .andReturn());
        assertThat(approved.path("purchaseOrderId").asLong()).isPositive();

        mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposalId)
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                Map.of("reason", "retry", "idempotencyKey", "b35-approve-2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idempotent").value(true));

        assertThat(purchaseOrders.count()).isEqualTo(poBefore + 1);
        PurchaseOrder po = purchaseOrders.findById(approved.path("purchaseOrderId").asLong()).orElseThrow();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.DRAFT);
        bridge(runId, a.supplier().getId(), ownerA, a.shopId(), 409);
    }

    private long positiveSimulation(Fixture fixture, String token) throws Exception {
        addSale(fixture, DAY.minusDays(2).atTime(10, 0), 14);
        return simulation(fixture, token);
    }

    private long simulation(Fixture fixture, String token) throws Exception {
        JsonNode response = body(mvc.perform(post("/api/savdograph/reorder-simulations")
                        .header("Authorization", token).header("X-Shop-Id", fixture.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "productId", fixture.product().getId(),
                                "lookbackStart", DAY.minusDays(7),
                                "lookbackEnd", DAY,
                                "leadTimeDays", 3,
                                "safetyStockDays", 2,
                                "forecastHorizonDays", 7))))
                .andExpect(status().isCreated()).andReturn());
        return response.path("analysisRunId").asLong();
    }

    private JsonNode getSimulationResponse(long runId) throws Exception {
        TenantContext.setShopId(a.shopId());
        List<EvidenceItem> evidence = evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(runId);
        EvidenceItem classification = evidence.stream()
                .filter(value -> value.getEvidenceType() == EvidenceType.RESULT_CLASSIFICATION)
                .findFirst().orElseThrow();
        JsonNode snapshot = json.readTree(classification.getInputData()).path("snapshot");
        ObjectNode withClassification = snapshot.deepCopy();
        ObjectNode evidenceIds = (ObjectNode) withClassification.path("evidenceIds");
        evidenceIds.put("classification", classification.getId());
        TenantContext.clear();
        return withClassification;
    }

    private MvcResult bridge(long runId, long supplierId, String token, long shopId, int statusCode)
            throws Exception {
        return mvc.perform(post("/api/savdograph/reorder-simulations/{id}/proposals", runId)
                        .header("Authorization", token).header("X-Shop-Id", shopId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("supplierId", supplierId))))
                .andExpect(status().is(statusCode))
                .andReturn();
    }

    private EvidenceItem evidence(long runId, Fixture fixture, EvidenceType type) {
        TenantContext.setShopId(fixture.shopId());
        EvidenceItem item = evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(runId).stream()
                .filter(value -> value.getEvidenceType() == type)
                .findFirst().orElseThrow();
        TenantContext.clear();
        return item;
    }

    private void rewriteEvidence(EvidenceItem item) {
        item.setContentHash(EvidenceContentHasher.hash(item));
        jdbc.update("""
                UPDATE savdograph_evidence_item
                   SET analysis_run_id = ?, product_id = ?, input_data = ?, calculated_result = ?,
                       unit = ?, currency = ?, content_hash = ?, hash_version = ?
                 WHERE id = ?
                """,
                item.getAnalysisRunId(), item.getProductId(), item.getInputData(), item.getCalculatedResult(),
                item.getUnit(), item.getCurrency() == null ? null : item.getCurrency().name(),
                item.getContentHash(), item.getHashVersion(), item.getId());
        entityManager.clear();
    }

    private static EvidenceItem copy(EvidenceItem source) {
        EvidenceItem copy = new EvidenceItem();
        copy.setShopId(source.getShopId());
        copy.setAnalysisRunId(source.getAnalysisRunId());
        copy.setProductId(source.getProductId());
        copy.setEvidenceType(source.getEvidenceType());
        copy.setSourceType(source.getSourceType());
        copy.setPeriodFrom(source.getPeriodFrom());
        copy.setPeriodTo(source.getPeriodTo());
        copy.setCalculationId(source.getCalculationId());
        copy.setCalculationVersion(source.getCalculationVersion());
        copy.setInputData(source.getInputData());
        copy.setCalculatedResult(source.getCalculatedResult());
        copy.setUnit(source.getUnit());
        copy.setCurrency(source.getCurrency());
        copy.setHashVersion(source.getHashVersion());
        return copy;
    }

    private Product product(Fixture fixture) {
        TenantContext.setShopId(fixture.shopId());
        Product product = products.findById(fixture.product().getId()).orElseThrow();
        TenantContext.clear();
        return product;
    }

    private void addSale(Fixture fixture, LocalDateTime createdAt, int quantity) {
        TenantContext.setShopId(fixture.shopId());
        Sale sale = new Sale();
        sale.setPaymentMethod("NAQD");
        sale.setCurrency(Currency.UZS);
        sale.setSubtotalUzs(new BigDecimal("140.00"));
        sale.setTotalUzs(new BigDecimal("140.00"));
        sale.setRefundedTotalUzs(BigDecimal.ZERO);
        sale.setCreatedAt(createdAt);
        SaleItem item = new SaleItem();
        item.setProductId(fixture.product().getId());
        item.setProductName(fixture.product().getName());
        item.setProductSku(fixture.product().getBarcode());
        item.setQuantity(quantity);
        item.setRefundedQty(0);
        item.setUnitPriceUzs(new BigDecimal("10.00"));
        item.setLineTotalUzs(new BigDecimal("140.00"));
        item.setCostAtSaleUzs(new BigDecimal("4.00"));
        item.setCostSnapshotProvenance(CostSnapshotProvenance.TRANSACTION_TIME);
        item.setCurrency(Currency.UZS);
        sale.addItem(item);
        sales.save(sale);
        TenantContext.clear();
    }

    private Fixture seed(String label, int quantity) {
        long accountId = IDS.incrementAndGet();
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) VALUES (?, ?, FALSE, now())",
                accountId, "SavdoGraph B3.5 tenant " + label);
        Shop shop = new Shop();
        shop.setAccountId(accountId);
        shop.setName("SavdoGraph B3.5 shop " + label);
        shop.setMain(true);
        shop = shops.save(shop);
        TenantContext.setShopId(shop.getId());
        Product product = new Product();
        product.setName("SavdoGraph B3.5 product " + label);
        product.setBarcode("B35-" + label + "-" + IDS.incrementAndGet());
        product.setPurchasePrice(new BigDecimal("4.00"));
        product.setSalePrice(new BigDecimal("10.00"));
        product.setQuantity(quantity);
        product.setCurrency(Currency.UZS);
        product.setUnit("dona");
        product = products.save(product);
        Supplier supplier = supplier("SavdoGraph B3.5 supplier " + label);
        TenantContext.clear();
        return new Fixture(accountId, shop.getId(), product, supplier);
    }

    private Supplier supplier(String name) {
        Supplier supplier = new Supplier();
        supplier.setName(name);
        return suppliers.save(supplier);
    }

    private static Set<Long> values(JsonNode object) {
        Set<Long> values = new HashSet<>();
        if (object.isObject()) {
            object.fields().forEachRemaining(entry -> values.add(entry.getValue().longValue()));
        } else {
            object.forEach(value -> values.add(value.longValue()));
        }
        return values;
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private static String bearer(long accountId, String... permissions) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return "Bearer " + Jwts.builder()
                .subject("1")
                .claim("username", "savdograph-b35-owner-" + accountId)
                .claim("role", "ACCOUNT_OWNER")
                .claim("accountId", accountId)
                .claim("perms", List.of(permissions))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(key)
                .compact();
    }

    private record Fixture(long accountId, long shopId, Product product, Supplier supplier) {
    }
}