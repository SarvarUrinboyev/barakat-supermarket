package uz.barakat.market.license;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import uz.barakat.market.repository.AccountRepository;

/**
 * Contract tests for the fixed same-origin License gateway. The fake upstream
 * is in-process; no Railway service, external host, credential, or payment
 * provider is contacted.
 */
@SpringBootTest(properties = {
        "LICENSE_GATEWAY_RESPONSE_TIMEOUT_MS=150",
        "LICENSE_GATEWAY_MAX_RESPONSE_BYTES=1024"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LicenseGatewayIntegrationTest {

    private static final String SECRET =
            "test-only-jwt-secret-not-for-production-0123456789abcdef";
    private static final FakeLicenseUpstream UPSTREAM = FakeLicenseUpstream.start();

    @Autowired private MockMvc mvc;
    @Autowired private AccountRepository accounts;

    @DynamicPropertySource
    static void gatewayProperties(DynamicPropertyRegistry registry) {
        registry.add("license.gateway.server-url", UPSTREAM::baseUrl);
    }

    @AfterAll
    static void stopUpstream() {
        UPSTREAM.close();
    }

    @BeforeEach
    void clearUpstream() {
        UPSTREAM.clear();
    }

    @Test
    void loginMapsOnlyToExactRouteAndStripsHostCookiesForwardedAndHopHeaders() throws Exception {
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"demo\",\"password\":\"synthetic\"}")
                        .header("Host", "attacker.invalid")
                        .header("Cookie", "session=not-forwarded")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .header("X-Trace", "not-forwarded")
                        .header("X-Api-Key", "sk_live_not-forwarded")
                        .header("Connection", "keep-alive"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));

        CapturedRequest request = UPSTREAM.onlyRequest();
        assertThat(request.method()).isEqualTo("POST");
        assertThat(request.path()).isEqualTo("/api/auth/login");
        assertThat(request.body()).contains("demo");
        assertThat(request.header("authorization")).isNull();
        assertThat(request.header("cookie")).isNull();
        assertThat(request.header("x-forwarded-for")).isNull();
        assertThat(request.header("x-trace")).isNull();
        assertThat(request.header("x-api-key")).isNull();
        assertThat(request.header("host")).isNotEqualTo("attacker.invalid");
        assertThat(request.header("connection")).doesNotContain("keep-alive");
        assertThat(request.header("accept")).isEqualTo("application/json");
    }

    @Test
    void sessionRefreshAndBillingRoutesMapExactlyAndPreserveOnlyBearerAuth() throws Exception {
        mvc.perform(post("/api/license/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"synthetic-refresh\"}"))
                .andExpect(status().isOk());
        String ownerBearer = ownerBearer(81234L);
        mvc.perform(get("/api/license/auth/me").header("Authorization", ownerBearer))
                .andExpect(status().isOk());
        mvc.perform(get("/api/license/billing/status").header("Authorization", ownerBearer))
                .andExpect(status().isOk());
        mvc.perform(post("/api/license/billing/checkout")
                        .header("Authorization", ownerBearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"DEMO\",\"months\":1}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/license/billing/payments").header("Authorization", ownerBearer))
                .andExpect(status().isOk());

        assertThat(UPSTREAM.paths()).containsExactly(
                "/api/auth/refresh", "/api/auth/me", "/api/billing/status",
                "/api/billing/checkout", "/api/billing/payments");
        assertThat(UPSTREAM.requests().get(1).header("authorization"))
                .isEqualTo(ownerBearer);
    }

    @Test
    void adminRoutesRequireSuperAdminAndForwardOnlyAfterBackendAuthorization() throws Exception {
        mvc.perform(get("/api/license/admin/accounts")
                        .header("Authorization", ownerBearer(81235L)))
                .andExpect(status().isForbidden());
        assertThat(UPSTREAM.requests()).isEmpty();

        String superAdmin = superAdminBearer(81236L);
        mvc.perform(get("/api/license/admin/accounts/77").header("Authorization", superAdmin))
                .andExpect(status().isOk());
        mvc.perform(post("/api/license/admin/accounts/77/grant")
                        .header("Authorization", superAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\":\"DEMO\",\"months\":1}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/license/admin/audit?page=2&size=10")
                        .header("Authorization", superAdmin))
                .andExpect(status().isOk());

        assertThat(UPSTREAM.paths()).containsExactly(
                "/api/admin/accounts/77", "/api/admin/accounts/77/grant", "/api/admin/audit");
        assertThat(UPSTREAM.requests().get(2).query()).isEqualTo("page=2&size=10");
        assertThat(UPSTREAM.requests().get(0).header("authorization")).isEqualTo(superAdmin);
    }

    @Test
    void unknownMethodsQueriesAndTraversalAreRejectedWithoutUpstreamForwarding() throws Exception {
        mvc.perform(get("/api/license/not-allowlisted"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/license/auth/login"))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(post("/api/license/auth/login?target=https://attacker.invalid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/license/%252e%252e/auth/me"))
                .andExpect(status().is4xxClientError());
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("not-json"))
                .andExpect(status().isUnsupportedMediaType());

        assertThat(UPSTREAM.requests()).isEmpty();
    }

    @Test
    void failuresTimeoutsPrivateHostnamesAndResponseLimitsAreSafe() throws Exception {
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"bad4\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().string("{\"code\":\"BAD_INPUT\"}"));
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"bad5\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("railway.internal"))));
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"internal\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("railway.internal"))));
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"large\"}"))
                .andExpect(status().isBadGateway());
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"slow\"}"))
                .andExpect(status().isGatewayTimeout());
        mvc.perform(post("/api/license/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"payload\":\"" + "x".repeat(262_145) + "\"}"))
                .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void gatewayDoesNotCreateLocalAccountOrShopState() throws Exception {
        long externalAccountId = 876_543L;
        assertThat(accounts.existsById(externalAccountId)).isFalse();

        mvc.perform(get("/api/license/auth/me")
                        .header("Authorization", ownerBearer(externalAccountId)))
                .andExpect(status().isOk());

        assertThat(accounts.existsById(externalAccountId)).isFalse();
        assertThat(UPSTREAM.onlyRequest().path()).isEqualTo("/api/auth/me");
    }

    private static String ownerBearer(long accountId) {
        return bearer(accountId, "ACCOUNT_OWNER");
    }

    private static String superAdminBearer(long accountId) {
        return bearer(accountId, "SUPER_ADMIN");
    }

    private static String bearer(long accountId, String role) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return "Bearer " + Jwts.builder()
                .subject("1")
                .claim("username", "gateway-test")
                .claim("role", role)
                .claim("accountId", accountId)
                .claim("perms", List.of("*:*") )
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }

    private record CapturedRequest(String method, String path, String query, String body,
                                   Map<String, List<String>> headers) {
        String header(String name) {
            return headers.entrySet().stream()
                    .filter(entry -> entry.getKey().equalsIgnoreCase(name))
                    .findFirst()
                    .map(entry -> String.join(",", entry.getValue()))
                    .orElse(null);
        }
    }

    private static final class FakeLicenseUpstream implements AutoCloseable {
        private final HttpServer server;
        private final ExecutorService executor = Executors.newCachedThreadPool();
        private final List<CapturedRequest> requests = new CopyOnWriteArrayList<>();

        private FakeLicenseUpstream(HttpServer server) {
            this.server = server;
            server.setExecutor(executor);
            server.createContext("/", this::handle);
            server.start();
        }

        static FakeLicenseUpstream start() {
            try {
                return new FakeLicenseUpstream(HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0));
            } catch (IOException ex) {
                throw new ExceptionInInitializerError(ex);
            }
        }

        String baseUrl() {
            return "http://127.0.0.1:" + server.getAddress().getPort();
        }

        List<CapturedRequest> requests() {
            return List.copyOf(requests);
        }

        List<String> paths() {
            return requests.stream().map(CapturedRequest::path).toList();
        }

        CapturedRequest onlyRequest() {
            assertThat(requests).hasSize(1);
            return requests.getFirst();
        }

        void clear() {
            requests.clear();
        }

        private void handle(HttpExchange exchange) throws IOException {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            requests.add(new CapturedRequest(exchange.getRequestMethod(), exchange.getRequestURI().getRawPath(),
                    exchange.getRequestURI().getRawQuery(), body, Map.copyOf(exchange.getRequestHeaders())));
            if (body.contains("\"slow\"")) {
                try {
                    Thread.sleep(400L);
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                }
            }
            int status = body.contains("\"bad4\"") ? 422
                    : (body.contains("\"bad5\"") ? 500 : 200);
            String response = body.contains("\"internal\"")
                    ? "{\"detail\":\"license.railway.internal\"}"
                    : (body.contains("\"large\"") ? "{\"payload\":\"" + "x".repeat(1_500) + "\"}"
                    : (status == 422 ? "{\"code\":\"BAD_INPUT\"}"
                    : "{\"route\":\"" + exchange.getRequestURI().getRawPath() + "\"}"));
            byte[] payload = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            try {
                exchange.sendResponseHeaders(status, payload.length);
                exchange.getResponseBody().write(payload);
            } catch (IOException ignored) {
                // A bounded client timeout may close the test socket first.
            } finally {
                exchange.close();
            }
        }

        @Override
        public void close() {
            server.stop(0);
            executor.shutdownNow();
        }
    }
}