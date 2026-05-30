package uz.barakat.market.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end authorization through the real Spring Security filter chain.
 * Tokens are minted with the test JWT secret (same as application-test) so
 * {@code JwtAuthFilter} accepts them and {@code SecurityConfig}'s per-endpoint
 * RESOURCE:ACTION rules decide the outcome. Closes gap (d): proves an actual
 * endpoint returns 403 when the permission is missing — not just that the
 * matching logic works in isolation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthorizationEndpointTest {

    /** Must match savdopro.jwt.secret in application-test.properties. */
    private static final String SECRET =
            "test-only-jwt-secret-not-for-production-0123456789abcdef";

    @Autowired
    private MockMvc mvc;

    @Test
    void anonymousRequestIsUnauthorized() throws Exception {
        mvc.perform(get("/api/management/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sensitiveReportDeniedWithoutManagementReadPermission() throws Exception {
        // A cashier-style token: can sell, but has no MANAGEMENT:READ.
        mvc.perform(get("/api/management/summary")
                        .header("Authorization", bearer("SHOP_USER", "SALES:READ", "SALES:WRITE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void sensitiveReportAllowedWithManagementReadPermission() throws Exception {
        mvc.perform(get("/api/management/summary")
                        .header("Authorization", bearer("ACCOUNT_OWNER", "MANAGEMENT:READ")))
                .andExpect(status().isOk());
    }

    @Test
    void sensitiveDeleteDeniedWithoutManagementWritePermission() throws Exception {
        // Has READ but not WRITE — the delete must be refused at the boundary.
        mvc.perform(delete("/api/management/costs/1")
                        .header("Authorization", bearer("ACCOUNT_OWNER", "MANAGEMENT:READ")))
                .andExpect(status().isForbidden());
    }

    private static String bearer(String role, String... perms) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        String jwt = Jwts.builder()
                .subject("1")
                .claim("username", "tester")
                .claim("role", role)
                .claim("accountId", 1L)
                .claim("perms", List.of(perms))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(1, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
        return "Bearer " + jwt;
    }
}
