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
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.atomic.AtomicLong;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.CostSnapshotProvenance;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Sale;
import uz.barakat.market.domain.SaleItem;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.PurchaseOrderRepository;
import uz.barakat.market.repository.SaleRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.repository.StockMovementRepository;

/** HTTP proof for B2 formulas, classifications, evidence, isolation, and no side effects. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:savdograph_b2_controller_it;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=false"
})
class SavdoGraphB2ControllerIT {

    private static final String SECRET = "test-only-jwt-secret-not-for-production-0123456789abcdef";
    private static final AtomicLong IDS = new AtomicLong(91_000L);
    private static final LocalDate DAY = LocalDate.of(2026, 7, 15);

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ShopRepository shops;
    @Autowired private ProductRepository products;
    @Autowired private SaleRepository sales;
    @Autowired private EvidenceItemRepository evidenceItems;
    @Autowired private PurchaseOrderRepository purchaseOrders;
    @Autowired private StockMovementRepository stockMovements;

    private Fixture a;
    private Fixture b;
    private String ownerA;
    private String ownerB;

    @BeforeEach
    void seedTenants() {
        a = seed("A", 4, new BigDecimal("999.00"));
        b = seed("B", 7, new BigDecimal("11.00"));
        ownerA = bearer(a.accountId());
        ownerB = bearer(b.accountId());
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void grossProfitIsVerifiedUsesCostSnapshotsIncludesCreditAndPersistsCanonicalEvidence() throws Exception {
        addSale(a, DAY.atTime(10, 0), "NAQD", "100.00", "10.00", 4, 1, "20.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        addSale(a, DAY.atTime(11, 0), "QARZGA", "50.00", "0.00", 1, 0, "30.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);

        JsonNode response = body(generateBrief(a, ownerA, DAY, DAY.plusDays(1)));
        assertThat(response.path("label").asText()).isEqualTo("Daily Gross Profit Brief");
        assertThat(response.path("classification").asText()).isEqualTo("VERIFIED");
        assertThat(response.path("revenueUzs").decimalValue()).isEqualByComparingTo("140.00");
        assertThat(response.path("refundedAmountUzs").decimalValue()).isEqualByComparingTo("10.00");
        assertThat(response.path("cogsUzs").decimalValue()).isEqualByComparingTo("90.00");
        assertThat(response.path("grossProfitUzs").decimalValue()).isEqualByComparingTo("50.00");
        assertThat(response.path("grossMarginPercent").decimalValue()).isEqualByComparingTo("35.71");
        assertThat(response.path("evidenceIds").size()).isEqualTo(8);

        long runId = response.path("analysisRunId").asLong();
        mvc.perform(get("/api/savdograph/gross-profit-briefs/{id}", runId)
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grossProfitUzs").value(50.00));

        TenantContext.setShopId(a.shopId());
        List<EvidenceItem> evidence = evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(runId);
        assertThat(evidence).hasSize(8);
        assertThat(evidence).allSatisfy(item -> {
            assertThat(item.getHashVersion()).isEqualTo("B1_CANONICAL_V1");
            assertThat(item.getContentHash()).hasSize(64);
        });
        assertThat(evidence.stream().filter(item -> item.getProductId() == null)).isNotEmpty();
    }

    @Test
    void briefUsesTashkentExclusiveEndAndDoesNotDependOnJvmDefaultTimezone() throws Exception {
        addSale(a, DAY.atStartOfDay().plusMinutes(1), "NAQD", "10.00", "0.00", 1, 0, "3.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        addSale(a, DAY.plusDays(1).atStartOfDay(), "NAQD", "999.00", "0.00", 1, 0, "1.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        TimeZone original = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Pacific/Auckland"));
            JsonNode response = body(generateBrief(a, ownerA, DAY, DAY.plusDays(1)));
            assertThat(response.path("timezone").asText()).isEqualTo("Asia/Tashkent");
            assertThat(response.path("revenueUzs").decimalValue()).isEqualByComparingTo("10.00");
            assertThat(response.path("completedSaleCount").asLong()).isEqualTo(1);
        } finally {
            TimeZone.setDefault(original);
        }
    }

    @Test
    void emptyAndNegativeGrossProfitPeriodsHaveExplicitSafeSemantics() throws Exception {
        JsonNode empty = body(generateBrief(a, ownerA, DAY, DAY.plusDays(1)));
        assertThat(empty.path("classification").asText()).isEqualTo("VERIFIED");
        assertThat(empty.path("revenueUzs").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(empty.path("grossMarginPercent").isMissingNode()).isTrue();
        assertThat(empty.path("grossMarginState").asText()).isEqualTo("UNAVAILABLE_ZERO_REVENUE");

        addSale(a, DAY.atTime(9, 0), "NAQD", "10.00", "0.00", 1, 0, "17.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        JsonNode negative = body(generateBrief(a, ownerA, DAY, DAY.plusDays(1)));
        assertThat(negative.path("grossProfitUzs").decimalValue()).isEqualByComparingTo("-7.00");
    }

    @Test
    void missingCostOrUnsupportedCurrencyProducesInsufficientDataWithoutCurrentCostFallback() throws Exception {
        addSale(a, DAY.atTime(9, 0), "NAQD", "10.00", "0.00", 1, 0, null,
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        JsonNode missingCost = body(generateBrief(a, ownerA, DAY, DAY.plusDays(1)));
        assertThat(missingCost.path("classification").asText()).isEqualTo("INSUFFICIENT_DATA");
        assertThat(missingCost.path("cogsUzs").isMissingNode()).isTrue();
        assertThat(missingCost.path("grossProfitUzs").isMissingNode()).isTrue();

        addSale(a, DAY.plusDays(2).atTime(9, 0), "NAQD", "10.00", "0.00", 1, 0, "1.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.USD);
        JsonNode mixedCurrency = body(generateBrief(a, ownerA, DAY.plusDays(2), DAY.plusDays(3)));
        assertThat(mixedCurrency.path("classification").asText()).isEqualTo("INSUFFICIENT_DATA");
        assertThat(mixedCurrency.path("revenueUzs").isMissingNode()).isTrue();
    }

    @Test
    void legacyCostProvenanceIsEstimatedRatherThanVerified() throws Exception {
        addSale(a, DAY.atTime(9, 0), "NAQD", "20.00", "0.00", 1, 0, "5.00",
                CostSnapshotProvenance.LEGACY_OR_UNKNOWN, Currency.UZS);
        JsonNode response = body(generateBrief(a, ownerA, DAY, DAY.plusDays(1)));
        assertThat(response.path("classification").asText()).isEqualTo("ESTIMATED");
        assertThat(response.path("grossProfitUzs").decimalValue()).isEqualByComparingTo("15.00");
    }

    @Test
    void reorderSimulatorUsesNetSalesScenarioAssumptionsAndCreatesNoSideEffects() throws Exception {
        addSale(a, DAY.minusDays(3).atTime(10, 0), "NAQD", "20.00", "0.00", 2, 0, "5.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        addSale(a, DAY.minusDays(2).atTime(10, 0), "NAQD", "20.00", "0.00", 2, 1, "5.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        addSale(a, DAY.minusDays(1).atTime(10, 0), "NAQD", "20.00", "0.00", 2, 0, "5.00",
                CostSnapshotProvenance.TRANSACTION_TIME, Currency.UZS);
        long poBefore = purchaseOrders.count();
        long movementBefore = stockMovements.count();
        int priceBefore = a.product().getSalePrice().intValueExact();

        JsonNode simulation = body(runSimulation(a, ownerA, DAY.minusDays(4), DAY, 2, 1, 3));
        assertThat(simulation.path("classification").asText()).isEqualTo("ESTIMATED");
        assertThat(simulation.path("netUnitsSold").decimalValue()).isEqualByComparingTo("5.00");
        assertThat(simulation.path("velocityUnitsPerDay").decimalValue()).isEqualByComparingTo("1.25");
        assertThat(simulation.path("reorderQuantity").asInt()).isEqualTo(4);
        assertThat(simulation.path("tiedUpCapitalUzs").isMissingNode()).isTrue();
        assertThat(simulation.path("evidenceIds").size()).isEqualTo(11);
        JsonNode repeated = body(runSimulation(a, ownerA, DAY.minusDays(4), DAY, 2, 1, 3));
        assertThat(repeated.path("netUnitsSold").decimalValue()).isEqualByComparingTo(simulation.path("netUnitsSold").decimalValue());
        assertThat(repeated.path("velocityUnitsPerDay").decimalValue()).isEqualByComparingTo(simulation.path("velocityUnitsPerDay").decimalValue());
        assertThat(repeated.path("reorderQuantity").asInt()).isEqualTo(simulation.path("reorderQuantity").asInt());
        assertThat(repeated.path("analysisRunId").asLong()).isNotEqualTo(simulation.path("analysisRunId").asLong());
        TenantContext.setShopId(a.shopId());
        EvidenceItem originalReorderEvidence = evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(simulation.path("analysisRunId").asLong())
                .stream().filter(item -> item.getEvidenceType().name().equals("REORDER_QUANTITY")).findFirst().orElseThrow();
        EvidenceItem repeatedReorderEvidence = evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(repeated.path("analysisRunId").asLong())
                .stream().filter(item -> item.getEvidenceType().name().equals("REORDER_QUANTITY")).findFirst().orElseThrow();
        assertThat(repeatedReorderEvidence.getInputData()).isEqualTo(originalReorderEvidence.getInputData());
        assertThat(repeatedReorderEvidence.getCalculatedResult())
                .isEqualByComparingTo(originalReorderEvidence.getCalculatedResult());
        mvc.perform(get("/api/savdograph/reorder-simulations/{id}", simulation.path("analysisRunId").asLong())
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reorderQuantity").value(4))
                .andExpect(jsonPath("$.evidenceIds.reorderQuantity").exists());
        assertThat(purchaseOrders.count()).isEqualTo(poBefore);
        assertThat(stockMovements.count()).isEqualTo(movementBefore);
        TenantContext.setShopId(a.shopId());
        assertThat(products.findById(a.product().getId()).orElseThrow().getSalePrice().intValueExact()).isEqualTo(priceBefore);
    }

    @Test
    void reorderHandlesZeroSalesNegativeStockBoundsAndCrossTenantProductSafely() throws Exception {
        JsonNode zero = body(runSimulation(a, ownerA, DAY.minusDays(7), DAY, 2, 1, 3));
        assertThat(zero.path("classification").asText()).isEqualTo("ESTIMATED");
        assertThat(zero.path("reorderQuantity").asInt()).isZero();
        assertThat(zero.path("coverageBeforeDays").isMissingNode()).isTrue();

        TenantContext.setShopId(a.shopId());
        Product negative = products.findById(a.product().getId()).orElseThrow();
        negative.setQuantity(-1);
        products.save(negative);
        TenantContext.clear();
        JsonNode negativeResult = body(runSimulation(a, ownerA, DAY.minusDays(7), DAY, 2, 1, 3));
        assertThat(negativeResult.path("classification").asText()).isEqualTo("INSUFFICIENT_DATA");

        mvc.perform(post("/api/savdograph/reorder-simulations")
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("productId", b.product().getId(),
                                "lookbackStart", DAY.minusDays(7), "lookbackEnd", DAY,
                                "leadTimeDays", 2, "safetyStockDays", 1, "forecastHorizonDays", 3))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/savdograph/reorder-simulations")
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("productId", a.product().getId(),
                                "lookbackStart", DAY.minusDays(7), "lookbackEnd", DAY,
                                "leadTimeDays", 61, "safetyStockDays", 1, "forecastHorizonDays", 3))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void crossTenantBriefReadIsDeniedAndV45MigratesTheB2Columns() throws Exception {
        JsonNode bBrief = body(generateBrief(b, ownerB, DAY, DAY.plusDays(1)));
        mvc.perform(get("/api/savdograph/gross-profit-briefs/{id}", bBrief.path("analysisRunId").asLong())
                        .header("Authorization", ownerA).header("X-Shop-Id", a.shopId()))
                .andExpect(status().isNotFound());
        Integer v45 = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '45' AND success = TRUE", Integer.class);
        assertThat(v45).isEqualTo(1);
    }

    private MvcResult generateBrief(Fixture fixture, String token, LocalDate from, LocalDate to) throws Exception {
        return mvc.perform(post("/api/savdograph/gross-profit-briefs")
                        .header("Authorization", token).header("X-Shop-Id", fixture.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("periodStart", from, "periodEnd", to))))
                .andExpect(status().isCreated()).andReturn();
    }

    private MvcResult runSimulation(Fixture fixture, String token, LocalDate from, LocalDate to,
                                    int leadDays, int safetyDays, int horizonDays) throws Exception {
        return mvc.perform(post("/api/savdograph/reorder-simulations")
                        .header("Authorization", token).header("X-Shop-Id", fixture.shopId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("productId", fixture.product().getId(),
                                "lookbackStart", from, "lookbackEnd", to, "leadTimeDays", leadDays,
                                "safetyStockDays", safetyDays, "forecastHorizonDays", horizonDays))))
                .andExpect(status().isCreated()).andReturn();
    }

    private void addSale(Fixture fixture, LocalDateTime createdAt, String paymentMethod, String total, String refunded,
                         int quantity, int refundedQty, String cost, CostSnapshotProvenance provenance,
                         Currency saleCurrency) {
        TenantContext.setShopId(fixture.shopId());
        Sale sale = new Sale();
        sale.setPaymentMethod(paymentMethod);
        sale.setCurrency(saleCurrency);
        sale.setSubtotalUzs(new BigDecimal(total));
        sale.setTotalUzs(new BigDecimal(total));
        sale.setRefundedTotalUzs(new BigDecimal(refunded));
        sale.setCreatedAt(createdAt);
        SaleItem item = new SaleItem();
        item.setProductId(fixture.product().getId());
        item.setProductName(fixture.product().getName());
        item.setProductSku(fixture.product().getBarcode());
        item.setQuantity(quantity);
        item.setRefundedQty(refundedQty);
        item.setUnitPriceUzs(new BigDecimal(total).divide(BigDecimal.valueOf(quantity)));
        item.setLineTotalUzs(new BigDecimal(total));
        item.setCostAtSaleUzs(cost == null ? null : new BigDecimal(cost));
        item.setCostSnapshotProvenance(provenance);
        item.setCurrency(Currency.UZS);
        sale.addItem(item);
        sales.save(sale);
        TenantContext.clear();
    }

    private Fixture seed(String label, int quantity, BigDecimal currentPrice) {
        long accountId = IDS.incrementAndGet();
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) VALUES (?, ?, FALSE, now())",
                accountId, "SavdoGraph B2 tenant " + label);
        Shop shop = new Shop();
        shop.setAccountId(accountId);
        shop.setName("SavdoGraph B2 shop " + label);
        shop.setMain(true);
        shop = shops.save(shop);
        TenantContext.setShopId(shop.getId());
        Product product = new Product();
        product.setName("SavdoGraph B2 product " + label);
        product.setBarcode("B2-" + label + "-" + IDS.incrementAndGet());
        product.setPurchasePrice(currentPrice);
        product.setSalePrice(new BigDecimal("25.00"));
        product.setQuantity(quantity);
        product.setLowStockThreshold(2);
        product.setCurrency(Currency.UZS);
        product.setUnit("dona");
        product = products.save(product);
        TenantContext.clear();
        return new Fixture(accountId, shop.getId(), product);
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    private static String bearer(long accountId) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return "Bearer " + Jwts.builder()
                .subject("1")
                .claim("username", "savdograph-b2-owner-" + accountId)
                .claim("role", "ACCOUNT_OWNER")
                .claim("accountId", accountId)
                .claim("perms", List.of("SAVDOGRAPH:READ", "SAVDOGRAPH:WRITE", "SAVDOGRAPH:DECIDE",
                        "SAVDOGRAPH_LEDGER:READ"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(key)
                .compact();
    }

    private record Fixture(long accountId, long shopId, Product product) {
    }
}
