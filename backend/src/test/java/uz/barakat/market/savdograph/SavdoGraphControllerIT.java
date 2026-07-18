package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.PurchaseOrder;
import uz.barakat.market.domain.PurchaseOrderStatus;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.domain.Supplier;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.PurchaseOrderRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.repository.SupplierRepository;
import uz.barakat.market.repository.ProductRepository;
import org.springframework.jdbc.core.JdbcTemplate;

/** HTTP-level B1 proof for tenant isolation, authorization, immutable evidence, and draft-only approval. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:savdograph_b1_controller_it;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=false"
})
class SavdoGraphControllerIT {

    private static final String SECRET = "test-only-jwt-secret-not-for-production-0123456789abcdef";
    private static final AtomicLong IDS = new AtomicLong(81_000L);

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ShopRepository shops;
    @Autowired private ProductRepository products;
    @Autowired private SupplierRepository suppliers;
    @Autowired private PurchaseOrderRepository purchaseOrders;
    @Autowired private EvidenceItemRepository evidenceItems;

    private Fixture a;
    private Fixture b;
    private String ownerA;
    private String ownerB;

    @BeforeEach
    void seedTenants() {
        a = seed("A");
        b = seed("B");
        ownerA = bearer(a.accountId(), "ACCOUNT_OWNER", "SAVDOGRAPH:READ", "SAVDOGRAPH:WRITE",
                "SAVDOGRAPH:DECIDE", "SAVDOGRAPH_LEDGER:READ");
        ownerB = bearer(b.accountId(), "ACCOUNT_OWNER", "SAVDOGRAPH:READ", "SAVDOGRAPH:WRITE",
                "SAVDOGRAPH:DECIDE", "SAVDOGRAPH_LEDGER:READ");
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void ownerApprovalCreatesExactlyOneDraftAndIsIdempotentAndAuditable() throws Exception {
        ProposalIds proposal = createProposal(a, ownerA);

        JsonNode approved = body(mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposal.proposalId())
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "stock gap verified", "idempotencyKey", "approve-a-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proposalStatus").value("DRAFT_CREATED"))
                .andExpect(jsonPath("$.idempotent").value(false))
                .andReturn());
        long poId = approved.path("purchaseOrderId").asLong();

        TenantContext.setShopId(a.shopId());
        PurchaseOrder po = purchaseOrders.findById(poId).orElseThrow();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.DRAFT);
        assertThat(po.getLines()).hasSize(1);
        assertThat(po.getLines().getFirst().getOrderedQty()).isEqualTo(8);
        assertThat(po.getLines().getFirst().getReceivedQty()).isZero();
        TenantContext.clear();

        mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposal.proposalId())
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "retry", "idempotencyKey", "approve-a-2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purchaseOrderId").value(poId))
                .andExpect(jsonPath("$.idempotent").value(true));

        mvc.perform(post("/api/savdograph/proposals/{id}/reject", proposal.proposalId())
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "conflict", "idempotencyKey", "reject-a-1"))))
                .andExpect(status().isConflict());

        List<String> eventTypes = jdbc.queryForList(
                "SELECT event_type FROM savdograph_action_ledger_event WHERE proposal_id = ?",
                String.class, proposal.proposalId());
        assertThat(eventTypes).contains("PROPOSAL_CREATED", "PROPOSAL_APPROVED", "DECISION_REPLAYED", "DECISION_CONFLICT");
        assertThat(eventTypes.stream().filter("DRAFT_PURCHASE_ORDER_CREATED"::equals)).hasSize(1);
    }

    @Test
    void rejectionIsIdempotentAndAConflictingApprovalIsRejected() throws Exception {
        ProposalIds proposal = createProposal(a, ownerA);

        mvc.perform(post("/api/savdograph/proposals/{id}/reject", proposal.proposalId())
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "owner declined", "idempotencyKey", "reject-a-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proposalStatus").value("REJECTED"))
                .andExpect(jsonPath("$.idempotent").value(false));

        mvc.perform(post("/api/savdograph/proposals/{id}/reject", proposal.proposalId())
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "retry", "idempotencyKey", "reject-a-2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idempotent").value(true));

        mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposal.proposalId())
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "conflict", "idempotencyKey", "approve-a-1"))))
                .andExpect(status().isConflict());

        List<String> eventTypes = jdbc.queryForList(
                "SELECT event_type FROM savdograph_action_ledger_event WHERE proposal_id = ?",
                String.class, proposal.proposalId());
        assertThat(eventTypes).contains("PROPOSAL_REJECTED", "DECISION_REPLAYED", "DECISION_CONFLICT");
    }

    @Test
    void nonOwnerDecisionIsRejectedServerSideAndRecorded() throws Exception {
        ProposalIds proposal = createProposal(a, ownerA);
        String cashier = bearer(a.accountId(), "SHOP_USER", "SAVDOGRAPH:DECIDE");

        mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposal.proposalId())
                        .header("Authorization", cashier)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "not owner", "idempotencyKey", "cashier-a-1"))))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/savdograph/proposals/{id}/reject", proposal.proposalId())
                        .header("Authorization", cashier)
                        .header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("reason", "not owner", "idempotencyKey", "cashier-a-2"))))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/savdograph/action-ledger")
                        .header("Authorization", ownerA)
                        .header("X-Shop-Id", a.shopId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.proposalId == " + proposal.proposalId() + ")].eventType")
                        .value(org.hamcrest.Matchers.hasItem("DECISION_DENIED")));
    }

    @Test
    void directIdsAndShopHeadersCannotCrossTenants() throws Exception {
        ProposalIds proposalB = createProposal(b, ownerB);

        mvc.perform(get("/api/savdograph/analysis-runs/{id}", proposalB.runId())
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/savdograph/evidence-items/{id}", proposalB.evidenceId())
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/savdograph/proposals/{id}", proposalB.proposalId())
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/savdograph/proposals/{id}/approve", proposalB.proposalId())
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("idempotencyKey", "cross-a-1"))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/savdograph/proposals")
                        .header("Authorization", ownerA).header("X-Shop-Id", b.shopId()))
                .andExpect(status().isForbidden());

        MvcResult ledgerResult = mvc.perform(get("/api/savdograph/action-ledger")
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isOk()).andReturn();
        assertThat(body(ledgerResult).findValues("proposalId"))
                .allSatisfy(id -> assertThat(id.asLong()).isNotEqualTo(proposalB.proposalId()));

        Integer tenantBOrders = jdbc.queryForObject(
                "SELECT COUNT(*) FROM purchase_order WHERE shop_id = ?", Integer.class, b.shopId());
        assertThat(tenantBOrders).isZero();
    }

    @Test
    void unsupportedQuantityIsRejectedAndImmutableEvidenceDoesNotSilentlyUpdate() throws Exception {
        long runId = createRun(a, ownerA);
        TenantContext.setShopId(a.shopId());
        Product highStock = new Product();
        highStock.setName("High stock " + IDS.incrementAndGet());
        highStock.setPurchasePrice(BigDecimal.ONE);
        highStock.setSalePrice(BigDecimal.TEN);
        highStock.setQuantity(20);
        highStock.setLowStockThreshold(5);
        highStock.setCurrency(Currency.UZS);
        highStock = products.save(highStock);
        TenantContext.clear();

        mvc.perform(post("/api/savdograph/evidence-items/reorder-quantity")
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("analysisRunId", runId, "productId", highStock.getId()))))
                .andExpect(status().isBadRequest());

        long evidenceId = createEvidence(a, ownerA, runId);
        TenantContext.setShopId(a.shopId());
        EvidenceItem attempt = evidenceItems.findById(evidenceId).orElseThrow();
        BigDecimal original = attempt.getCalculatedResult();
        attempt.setCalculatedResult(BigDecimal.valueOf(999));
        evidenceItems.saveAndFlush(attempt);
        EvidenceItem reloaded = evidenceItems.findById(evidenceId).orElseThrow();
        assertThat(reloaded.getCalculatedResult()).isEqualByComparingTo(original);
        TenantContext.clear();
    }

    private ProposalIds createProposal(Fixture fixture, String token) throws Exception {
        long runId = createRun(fixture, token);
        long evidenceId = createEvidence(fixture, token, runId);
        MvcResult result = mvc.perform(post("/api/savdograph/proposals")
                        .header("Authorization", token).header("X-Shop-Id", fixture.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("analysisRunId", runId,
                                "supplierId", fixture.supplierId(), "evidenceIds", List.of(evidenceId)))))
                .andExpect(status().isCreated()).andReturn();
        return new ProposalIds(runId, evidenceId, body(result).path("id").asLong());
    }

    private long createRun(Fixture fixture, String token) throws Exception {
        MvcResult result = mvc.perform(post("/api/savdograph/analysis-runs")
                        .header("Authorization", token).header("X-Shop-Id", fixture.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("analysisType", "REORDER_LOW_STOCK",
                                "periodFrom", "2026-07-01", "periodTo", "2026-07-18"))))
                .andExpect(status().isCreated()).andReturn();
        return body(result).path("id").asLong();
    }

    private long createEvidence(Fixture fixture, String token, long runId) throws Exception {
        MvcResult result = mvc.perform(post("/api/savdograph/evidence-items/reorder-quantity")
                        .header("Authorization", token).header("X-Shop-Id", fixture.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("analysisRunId", runId, "productId", fixture.productId()))))
                .andExpect(status().isCreated()).andReturn();
        return body(result).path("id").asLong();
    }

    private Fixture seed(String label) {
        long accountId = IDS.incrementAndGet();
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) VALUES (?, ?, FALSE, now())",
                accountId, "SavdoGraph tenant " + label);
        Shop shop = new Shop();
        shop.setAccountId(accountId);
        shop.setName("SavdoGraph shop " + label);
        shop.setMain(true);
        shop = shops.save(shop);

        TenantContext.setShopId(shop.getId());
        Product product = new Product();
        product.setName("SavdoGraph product " + label);
        product.setPurchasePrice(new BigDecimal("12.50"));
        product.setSalePrice(new BigDecimal("20.00"));
        product.setQuantity(2);
        product.setLowStockThreshold(10);
        product.setCurrency(Currency.UZS);
        product.setUnit("dona");
        product = products.save(product);
        Supplier supplier = new Supplier();
        supplier.setName("Supplier " + label);
        supplier = suppliers.save(supplier);
        TenantContext.clear();
        return new Fixture(accountId, shop.getId(), product.getId(), supplier.getId());
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private static String bearer(long accountId, String role, String... permissions) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return "Bearer " + Jwts.builder()
                .subject("1")
                .claim("username", "savdograph-owner-" + accountId)
                .claim("role", role)
                .claim("accountId", accountId)
                .claim("perms", List.of(permissions))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }

    private record Fixture(long accountId, long shopId, long productId, long supplierId) {
    }

    private record ProposalIds(long runId, long evidenceId, long proposalId) {
    }
}
