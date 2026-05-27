package uz.barakat.market.auth;

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
import uz.barakat.market.domain.AppUser;

/**
 * Stateless JWT issuer / parser. The desktop client stores the token in
 * localStorage; every API call sends it back as {@code Authorization:
 * Bearer ...}. The token carries the user id, account id and role so the
 * filter doesn't need a DB round-trip on the hot path.
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

    private static final long TOKEN_TTL_DAYS = 30;

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
        // HS256 requires at least 32 bytes of key material. We fail closed:
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
        Instant now = Instant.now();
        Instant exp = now.plus(TOKEN_TTL_DAYS, ChronoUnit.DAYS);
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("username", user.getUsername())
                .claim("role", user.getRole().name())
                .claim("accountId", user.getAccountId())
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(signingKey)
                .compact();
    }

    /** Returns the JWT claims if the token is valid, else throws. */
    public Claims parse(String token) {
        // Allow up to 3 hours of clock skew so that tokens issued by the
        // central License Server (VPS) are accepted even when the VPS system
        // clock drifts relative to the local machine. 10 800 s = 3 hours.
        return Jwts.parser()
                .verifyWith(signingKey)
                .clockSkewSeconds(10_800)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
