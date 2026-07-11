package uz.barakat.market.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * N4 — proves the runbook EXT-1 relabel + worklist SQL on the REAL engine
 * (PostgreSQL, what prod runs), not H2. The two differ on exactly the features
 * this SQL leans on: {@code regexp_replace(...,'g')} and a correlated
 * {@code UPDATE ... WHERE EXISTS}. {@link CustomerLedgerRelabelIT} rehearses the
 * behaviour end-to-end on H2 (fast, via real services); this pins the SQL's
 * semantics on Postgres with a minimal hand-built schema so "exact runbook SQL"
 * is proven on the exact engine before the Gate C deploy night.
 *
 * <p>The container is started manually (not via {@code @Container}) so the test
 * SKIPS cleanly when no Docker environment is reachable (e.g. a dev laptop where
 * Testcontainers can't reach the daemon socket) and RUNS on CI, where Docker is
 * present. The identical SQL result was also confirmed by hand against
 * postgres:16 during development.
 */
class CustomerLedgerRelabelPostgresIT {

    private static PostgreSQLContainer<?> PG;

    /** Verbatim from the runbook EXT-1 §3b — keep in sync with the H2 rehearsal. */
    private static final String RELABEL = """
            UPDATE customer_transactions ct SET currency = 'UZS'
            WHERE ct.description LIKE 'POS qarz sotuvi #%'
              AND ct.created_at >= DATE '2026-07-11'
              AND ct.currency = 'USD'
              AND EXISTS (
                    SELECT 1 FROM sales s
                    WHERE s.id = CAST(regexp_replace(ct.description, '[^0-9]', '', 'g') AS BIGINT)
                      AND s.currency = 'UZS'
                      AND NOT EXISTS (SELECT 1 FROM sale_items si
                                      WHERE si.sale_id = s.id AND si.currency = 'USD'))""";

    private static final String WORKLIST = """
            SELECT ct.id FROM customer_transactions ct
            WHERE ct.description LIKE 'POS qarz sotuvi #%'
              AND ct.created_at >= DATE '2026-07-11'
              AND ct.currency = 'USD'
              AND NOT EXISTS (
                    SELECT 1 FROM sales s
                    WHERE s.id = CAST(regexp_replace(ct.description, '[^0-9]', '', 'g') AS BIGINT)
                      AND s.currency = 'UZS'
                      AND NOT EXISTS (SELECT 1 FROM sale_items si
                                      WHERE si.sale_id = s.id AND si.currency = 'USD'))""";

    private static Connection conn;

    @BeforeAll
    static void setup() throws Exception {
        assumeTrue(DockerClientFactory.instance().isDockerAvailable(),
                "Docker not available — skipping the Postgres engine test (runs on CI)");
        PG = new PostgreSQLContainer<>("postgres:16-alpine");
        PG.start();
        conn = DriverManager.getConnection(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword());
        try (Statement st = conn.createStatement()) {
            // Minimal schema mirroring the columns the EXT-1 SQL touches.
            st.execute("""
                CREATE TABLE sales (id BIGINT PRIMARY KEY, currency VARCHAR(3) NOT NULL)""");
            st.execute("""
                CREATE TABLE sale_items (id BIGSERIAL PRIMARY KEY, sale_id BIGINT NOT NULL,
                                         currency VARCHAR(3) NOT NULL)""");
            st.execute("""
                CREATE TABLE customer_transactions (
                    id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL,
                    amount NUMERIC(15,2) NOT NULL, currency VARCHAR(3) NOT NULL,
                    description VARCHAR(255), created_at TIMESTAMP NOT NULL)""");

            // (b) pure-so'm credit sale -> should relabel to UZS.
            st.execute("INSERT INTO sales VALUES (1001, 'UZS')");
            st.execute("INSERT INTO sale_items (sale_id, currency) VALUES (1001, 'UZS')");
            st.execute("INSERT INTO customer_transactions (customer_id, amount, currency, description, created_at) "
                    + "VALUES (1, 63500, 'USD', 'POS qarz sotuvi #1001', TIMESTAMP '2026-07-15 10:00:00')");

            // (c) mixed credit sale (has a USD line) -> worklist, never guessed.
            st.execute("INSERT INTO sales VALUES (1002, 'UZS')");
            st.execute("INSERT INTO sale_items (sale_id, currency) VALUES (1002, 'UZS')");
            st.execute("INSERT INTO sale_items (sale_id, currency) VALUES (1002, 'USD')");
            st.execute("INSERT INTO customer_transactions (customer_id, amount, currency, description, created_at) "
                    + "VALUES (1, 70000, 'USD', 'POS qarz sotuvi #1002', TIMESTAMP '2026-07-15 10:00:00')");

            // (a) USD-era manual (non-credit-sale) row -> untouched.
            st.execute("INSERT INTO customer_transactions (customer_id, amount, currency, description, created_at) "
                    + "VALUES (1, 50, 'USD', 'Eski qarz (USD)', TIMESTAMP '2026-06-01 10:00:00')");
        }
    }

    @AfterAll
    static void tearDown() throws Exception {
        if (conn != null) conn.close();
        if (PG != null) PG.stop();
    }

    private String currencyOf(String description) throws Exception {
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                     "SELECT currency FROM customer_transactions WHERE description = '" + description + "'")) {
            return rs.next() ? rs.getString(1) : null;
        }
    }

    @Test
    void relabelAndWorklistBehaveTheSameOnPostgres() throws Exception {
        int relabeled;
        List<Long> worklist = new ArrayList<>();
        try (Statement st = conn.createStatement()) {
            relabeled = st.executeUpdate(RELABEL);
            try (ResultSet rs = st.executeQuery(WORKLIST)) {
                while (rs.next()) worklist.add(rs.getLong(1));
            }
        }

        assertThat(relabeled).as("only the pure-so'm credit sale").isEqualTo(1);
        assertThat(currencyOf("POS qarz sotuvi #1001")).isEqualTo("UZS");  // (b) corrected
        assertThat(currencyOf("POS qarz sotuvi #1002")).isEqualTo("USD");  // (c) left, not guessed
        assertThat(currencyOf("Eski qarz (USD)")).isEqualTo("USD");        // (a) untouched

        // (c)'s row id is the one on the worklist; (a) and (b) are not.
        Long mixedId;
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                     "SELECT id FROM customer_transactions WHERE description = 'POS qarz sotuvi #1002'")) {
            rs.next();
            mixedId = rs.getLong(1);
        }
        assertThat(worklist).containsExactly(mixedId);
    }
}
