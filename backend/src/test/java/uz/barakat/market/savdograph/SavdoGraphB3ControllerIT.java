package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Set;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.ActionLedgerEvent;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Shop;
import uz.barakat.market.repository.ActionLedgerEventRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.PurchaseOrderRepository;
import uz.barakat.market.repository.ShopRepository;
import uz.barakat.market.repository.StockMovementRepository;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotLanguage;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotStatus;
import uz.barakat.market.dto.SavdoGraphB3Dtos.StructuredCopilotResult;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ToolCall;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotSchemas;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotToolRegistry;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotToolRegistry.ToolException;

/** HTTP proof for read permission, unavailable mode, audit privacy, and no side effects. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:savdograph_b3_controller_it;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "app.demo-seed.enabled=false",
        "OPENAI_API_KEY=",
        "OPENAI_MODEL=gpt-5.6-terra"
})
class SavdoGraphB3ControllerIT {

    private static final String SECRET = "test-only-jwt-secret-not-for-production-0123456789abcdef";
    private static final AtomicLong IDS = new AtomicLong(120_000L);

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ShopRepository shops;
    @Autowired private ActionLedgerEventRepository ledger;
    @Autowired private PurchaseOrderRepository purchaseOrders;
    @Autowired private ProductRepository products;
    @Autowired private StoreCopilotGroundingValidator grounding;
    @Autowired private StoreCopilotToolRegistry tools;
    @Autowired private StockMovementRepository stockMovements;

    private long accountId;
    private long shopId;

    @BeforeEach
    void seedTenant() {
        accountId = IDS.incrementAndGet();
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) VALUES (?, ?, FALSE, now())",
                accountId, "SavdoGraph B3 tenant");
        Shop shop = new Shop();
        shop.setAccountId(accountId);
        shop.setName("SavdoGraph B3 shop");
        shop.setMain(true);
        shopId = shops.save(shop).getId();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void readPermissionGetsTypedProviderUnavailableAndPrivacySafeImmutableAudit() throws Exception {
        long purchaseOrdersBefore = purchaseOrders.count();
        long stockMovementsBefore = stockMovements.count();

        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of("SAVDOGRAPH:READ")))
                        .header("X-Shop-Id", shopId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"Bugungi yalpi foyda qancha?\",\"locale\":\"UZ\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.errorCode").value("PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.language").value("uz"))
                .andExpect(jsonPath("$.model").value("gpt-5.6-terra"))
                .andExpect(jsonPath("$.promptVersion").value("SAVDOGRAPH_COPILOT_V1"))
                .andExpect(jsonPath("$.facts").isEmpty())
                .andExpect(jsonPath("$.evidenceIds").isEmpty())
                .andExpect(jsonPath("$.rawProviderRequest").doesNotExist())
                .andExpect(jsonPath("$.reasoning").doesNotExist())
                .andExpect(jsonPath("$.apiKey").doesNotExist());

        assertThat(purchaseOrders.count()).isEqualTo(purchaseOrdersBefore);
        assertThat(stockMovements.count()).isEqualTo(stockMovementsBefore);
        TenantContext.setShopId(shopId);
        List<ActionLedgerEvent> events = ledger.findAllByOrderByIdDesc();
        assertThat(events).extracting(ActionLedgerEvent::getEventType)
                .contains("COPILOT_INTERACTION_STARTED", "COPILOT_PROVIDER_ERROR");
        assertThat(events).allSatisfy(event -> {
            assertThat(event.getActor()).startsWith("savdo_").doesNotContain("owner", "@", "+998");
            assertThat(event.getDetails()).doesNotContain("Bugungi", "OPENAI_API_KEY", SECRET);
        });
    }

    @Test
    void writeOnlyOrMissingSavdoGraphPermissionCannotAsk() throws Exception {
        String body = "{\"question\":\"What is Gross Profit?\",\"locale\":\"EN\"}";
        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of("SAVDOGRAPH:WRITE")))
                        .header("X-Shop-Id", shopId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of()))
                        .header("X-Shop-Id", shopId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void requestLengthAndBoundedContextValidationFailBeforeProviderUse() throws Exception {
        String oversized = "x".repeat(1201);
        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of("SAVDOGRAPH:READ")))
                        .header("X-Shop-Id", shopId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"" + oversized + "\",\"locale\":\"EN\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of("SAVDOGRAPH:READ")))
                        .header("X-Shop-Id", shopId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"simulate\",\"locale\":\"EN\",\"lookbackDays\":91}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of("SAVDOGRAPH:READ")))
                        .header("X-Shop-Id", shopId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"profit\",\"locale\":\"EN\",\"shopId\":999}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/savdograph/ask")
                        .header("Authorization", bearer(List.of("SAVDOGRAPH:READ")))
                        .header("X-Shop-Id", shopId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"profit\",\"locale\":\"EN\","
                                + "\"periodStart\":\"2026-01-01\",\"periodEnd\":\"2026-02-02\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void realTenantFilterRejectsAnotherShopsProductBeforeSimulation() {
        long otherAccountId = IDS.incrementAndGet();
        jdbc.update("INSERT INTO accounts (id, name, blocked, created_at) VALUES (?, ?, FALSE, now())",
                otherAccountId, "SavdoGraph B3 other tenant");
        Shop other = new Shop();
        other.setAccountId(otherAccountId);
        other.setName("SavdoGraph B3 other shop");
        other.setMain(true);
        long otherShopId = shops.save(other).getId();

        TenantContext.setShopId(otherShopId);
        Product foreign = new Product();
        foreign.setName("Other tenant tea");
        foreign.setBarcode("B3-OTHER-TENANT");
        long foreignId = products.save(foreign).getId();
        var foreignState = tools.newInteraction();
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("b3-test", "", "ROLE_USER"));
        tools.execute(new ToolCall("foreign-gross", StoreCopilotSchemas.GROSS_PROFIT_TOOL,
                mapper.createObjectNode().put("start_date", "2026-07-01")
                        .put("end_date", "2026-07-02").put("timezone", "Asia/Tashkent")), foreignState);

        TenantContext.setShopId(shopId);
        var state = tools.newInteraction();
        assertThatThrownBy(() -> tools.allowExplicitProduct(state, foreignId))
                .isInstanceOfSatisfying(ToolException.class,
                        ex -> assertThat(ex.code()).isEqualTo("INVALID_TOOL_ARGUMENTS"));

        var foreignEvidenceIds = foreignState.evidenceIds().stream().sorted().toList();
        var foreignClassification = foreignState.classificationByEvidence().values().iterator().next();
        var foreignResult = new StructuredCopilotResult(CopilotStatus.INSUFFICIENT_DATA,
                CopilotLanguage.en, "Data is insufficient.", foreignClassification, List.of(), List.of(),
                List.of(), List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL), foreignEvidenceIds, List.of());
        var validation = grounding.validate(foreignResult, foreignState, Set.of());
        assertThat(validation.valid()).isFalse();
        assertThat(validation.reason()).isEqualTo("cross_tenant_or_missing_evidence");
    }

    private String bearer(List<String> permissions) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return "Bearer " + Jwts.builder()
                .subject("1")
                .claim("username", "savdograph-b3-owner")
                .claim("role", "ACCOUNT_OWNER")
                .claim("accountId", accountId)
                .claim("perms", permissions)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(key)
                .compact();
    }
}
