package uz.barakat.market;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Boots the full application context on an in-memory H2 so that every bean
 * wires up and all Flyway migrations (V1..V21 + the V15 Java migration)
 * apply cleanly. The cheapest guard against security / WebSocket / JPA
 * wiring regressions and migration breakage.
 */
@SpringBootTest
@ActiveProfiles("test")
class ApplicationContextSmokeTest {

    @Test
    void contextLoads() {
        // Success = the Spring context started: SecurityConfig's authorization
        // rules, the tenant-filter aspect, the WebSocket auth interceptor, all
        // JPA repositories, and the Flyway migration chain are all valid.
    }
}
