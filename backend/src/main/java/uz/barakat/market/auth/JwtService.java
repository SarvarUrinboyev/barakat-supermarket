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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uz.barakat.market.domain.AppUser;

/**
 * Stateless JWT issuer / parser. The desktop client stores the token in
 * localStorage; every API call sends it back as {@code Authorization:
 * Bearer ...}. The token carries the user id, account id and role so the
 * filter doesn't need a DB round-trip on the hot path.
 */
@Service
public class JwtService {

    private static final long TOKEN_TTL_DAYS = 30;

    private final String configuredSecret;
    private SecretKey signingKey;

    public JwtService(@Value("${savdopro.jwt.secret:}") String configuredSecret) {
        this.configuredSecret = configuredSecret;
    }

    @PostConstruct
    void init() {
        // HS256 requires at least 32 bytes of key material. If the property
        // isn't set we synthesize a stable-but-app-private key so dev runs
        // don't need extra config; for production deploy the operator sets
        // savdopro.jwt.secret to a 64+ char random string.
        String key = configuredSecret;
        if (key == null || key.length() < 32) {
            key = "savdopro-dev-secret-please-override-in-production-XXXXXXXXXXXXXXXX";
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
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
