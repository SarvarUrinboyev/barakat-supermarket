package db.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** Static assertion for the PostgreSQL-only DDL while Docker/PostgreSQL is unavailable. */
class V44SavdoGraphPostgresqlHardeningMigrationTest {

    @Test
    void declaresAppendOnlyTenantScopeEnumChecksAndTheExistingDecisionUniqueKey() throws Exception {
        String ddl = String.join("\n", V44__savdograph_postgresql_hardening.POSTGRESQL_STATEMENTS);
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(
                "db/migration/V42__savdograph_foundation.sql")) {
            assertThat(stream).isNotNull();
            String foundation = new String(stream.readAllBytes(), StandardCharsets.UTF_8);

            assertThat(ddl).contains("BEFORE UPDATE OR DELETE ON savdograph_evidence_item",
                    "BEFORE UPDATE OR DELETE ON savdograph_proposal_decision",
                    "BEFORE UPDATE OR DELETE ON savdograph_action_ledger_event",
                    "trg_sg_proposal_evidence_scope", "ck_sg_evidence_type",
                    "ck_sg_proposal_status", "ck_sg_decision_value");
            assertThat(foundation).contains("CONSTRAINT uq_sg_proposal_decision UNIQUE (proposal_id)");
        }
    }

}
