package uz.barakat.license.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uz.barakat.license.domain.AppUser;

/**
 * Stateless JWT issuer / parser. The desktop client stores the token in
 * localStorage; every API call sends it back as {@code Authorization:
 * Bearer ...}. The token carries the user id, account id and role so the
 * filter doesn't need a DB round-trip on the hot path.
 *
 * <h2>TTL</h2>
 * Tokens live for {@link #TOKEN_TTL_HOURS} hours. The desktop app reuses
 * the same JWT for both the License Server (auth / admin) and the local
 * backend (data) — so we keep the window short enough that a leaked
 * token can't impersonate a user for weeks, but long enough that a
 * cashier doesn't have to log in mid-shift. Refresh-token flow is on
 * the Phase 3 roadmap.
 *
 * <h2>Secret</h2>
 * <ul>
 *   <li>Default (safe): if {@code savdopro.jwt.secret} is unset, shorter
 *       than 32 chars, or equal to the well-known dev fallback string,
 *       the app refuses to start. The operator must supply a 64+ char
 *       random string via the {@code SAVDOPRO_JWT_SECRET} env var.</li>
 *   <li>Opt-in for development: setting
 *       {@code SAVDOPRO_ALLOW_DEV_SECRET=true} lets the app boot on the
 *       dev fallback with a loud WARN. Never set this on a server that
 *       holds real data.</li>
 * </ul>
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    /** Match the dev default so we can detect it at startup. */
    static final String DEV_FALLBACK_SECRET =
            "savdopro-dev-secret-please-override-in-production-XXXXXXXXXXXXXXXX";

    /**
     * Access-token lifetime. Short on purpose (1h) — the desktop client
     * pairs each access token with a refresh token (7d) and silently
     * rotates before expiry, so a leaked access token grants at most
     * one hour of impersonation. Refresh flow is implemented in
     * {@link RefreshTokenService}.
     */
    private static final long TOKEN_TTL_HOURS = 1;

    private final String configuredSecret;
    private final boolean allowDevSecret;
    private SecretKey signingKey;

    public JwtService(@Value("${savdopro.jwt.secret:}") String configuredSecret,
                      @Value("${SAVDOPRO_ALLOW_DEV_SECRET:false}") boolean allowDevSecret) {
        this.configuredSecret = configuredSecret;
        this.allowDevSecret = allowDevSecret;
    }

    @PostConstruct
    void init() {
        // HS256/HS512 needs at least 32 bytes of key material. We fail closed:
        // if the operator hasn't supplied a strong secret, refuse to start
        // unless SAVDOPRO_ALLOW_DEV_SECRET=true explicitly opts in to the
        // dev fallback (intended for local development only).
        String key = configuredSecret;
        boolean weak = key == null || key.length() < 32 || DEV_FALLBACK_SECRET.equals(key);

        if (weak) {
            if (!allowDevSecret) {
                throw new IllegalStateException(
                        "REFUSING TO START: savdopro.jwt.secret is unset, shorter than 32 "
                                + "chars, or set to the dev fallback. Generate a 64+ char "
                                + "random string (e.g. `openssl rand -base64 48`) and pass "
                                + "it via the SAVDOPRO_JWT_SECRET env var. To explicitly "
                                + "allow the dev fallback for local development, set "
                                + "SAVDOPRO_ALLOW_DEV_SECRET=true.");
            }
            key = DEV_FALLBACK_SECRET;
            log.warn("=================================================================");
            log.warn("  JWT secret is the DEV FALLBACK — DO NOT USE IN PRODUCTION.");
            log.warn("  SAVDOPRO_ALLOW_DEV_SECRET=true is set; booting anyway.");
            log.warn("  Set SAVDOPRO_JWT_SECRET to a 64+ char random string before deploy.");
            log.warn("=================================================================");
        }

        this.signingKey = Keys.hmacShaKeyFor(key.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(AppUser user) {
        return issueFor(user.getId(), user.getUsername(),
                user.getRole().name(), user.getAccountId());
    }

    /**
     * Lower-level issuer used by the refresh flow — the refresh code
     * already knows the claim values it wants and doesn't need to
     * re-load the AppUser entity just to project them.
     */
    public String issueFor(Long userId, String username, String role, Long accountId) {
        Instant now = Instant.now();
        Instant exp = now.plus(TOKEN_TTL_HOURS, ChronoUnit.HOURS);
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)
                .claim("accountId", accountId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(signingKey)
                .compact();
    }

    /** Lets the controller layer expose the access-token TTL to clients. */
    public long accessTtlSeconds() {
        return TOKEN_TTL_HOURS * 3600L;
    }

    /** Returns the JWT claims if the token is valid, else throws. */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
