package db.migration;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * PostgreSQL-only B1.1 enforcement. H2 remains the project's test database,
 * so it records this migration as a deliberate no-op while a real PostgreSQL
 * database receives immutable-row and tenant-reference triggers.
 */
public class V44__savdograph_postgresql_hardening extends BaseJavaMigration {

    static final List<String> POSTGRESQL_STATEMENTS = List.of(
            """
            ALTER TABLE savdograph_analysis_run
                ADD CONSTRAINT ck_sg_run_status CHECK (status IN ('RECORDED'))
            """,
            """
            ALTER TABLE savdograph_evidence_item
                ADD CONSTRAINT ck_sg_evidence_type CHECK (evidence_type IN ('REORDER_QUANTITY')),
                ADD CONSTRAINT ck_sg_evidence_result CHECK (calculated_result IS NULL OR calculated_result >= 0)
            """,
            """
            ALTER TABLE savdograph_decision_proposal
                ADD CONSTRAINT ck_sg_proposal_type CHECK (proposal_type IN ('REORDER')),
                ADD CONSTRAINT ck_sg_proposal_quantity CHECK (proposed_reorder_quantity > 0),
                ADD CONSTRAINT ck_sg_proposal_status CHECK (status IN ('PROPOSED', 'REJECTED', 'DRAFT_CREATED'))
            """,
            """
            ALTER TABLE savdograph_proposal_decision
                ADD CONSTRAINT ck_sg_decision_value CHECK (decision IN ('APPROVE', 'REJECT'))
            """,
            """
            CREATE OR REPLACE FUNCTION savdograph_reject_append_only_change()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
            END;
            $$
            """,
            """
            CREATE TRIGGER trg_sg_evidence_append_only
            BEFORE UPDATE OR DELETE ON savdograph_evidence_item
            FOR EACH ROW EXECUTE FUNCTION savdograph_reject_append_only_change()
            """,
            """
            CREATE TRIGGER trg_sg_decision_append_only
            BEFORE UPDATE OR DELETE ON savdograph_proposal_decision
            FOR EACH ROW EXECUTE FUNCTION savdograph_reject_append_only_change()
            """,
            """
            CREATE TRIGGER trg_sg_ledger_append_only
            BEFORE UPDATE OR DELETE ON savdograph_action_ledger_event
            FOR EACH ROW EXECUTE FUNCTION savdograph_reject_append_only_change()
            """,
            """
            CREATE OR REPLACE FUNCTION savdograph_assert_evidence_scope()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE reference_shop BIGINT;
            BEGIN
                SELECT shop_id INTO reference_shop FROM savdograph_analysis_run WHERE id = NEW.analysis_run_id;
                IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Evidence analysis run must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                SELECT shop_id INTO reference_shop FROM products WHERE id = NEW.product_id;
                IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Evidence product must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
            END;
            $$
            """,
            """
            CREATE TRIGGER trg_sg_evidence_scope
            BEFORE INSERT OR UPDATE ON savdograph_evidence_item
            FOR EACH ROW EXECUTE FUNCTION savdograph_assert_evidence_scope()
            """,
            """
            CREATE OR REPLACE FUNCTION savdograph_assert_proposal_scope()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE reference_shop BIGINT;
            BEGIN
                SELECT shop_id INTO reference_shop FROM savdograph_analysis_run WHERE id = NEW.analysis_run_id;
                IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Proposal analysis run must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                SELECT shop_id INTO reference_shop FROM products WHERE id = NEW.product_id;
                IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Proposal product must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                SELECT shop_id INTO reference_shop FROM suppliers WHERE id = NEW.supplier_id;
                IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Proposal supplier must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
            END;
            $$
            """,
            """
            CREATE TRIGGER trg_sg_proposal_scope
            BEFORE INSERT OR UPDATE ON savdograph_decision_proposal
            FOR EACH ROW EXECUTE FUNCTION savdograph_assert_proposal_scope()
            """,
            """
            CREATE OR REPLACE FUNCTION savdograph_assert_proposal_evidence_scope()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE proposal_shop BIGINT;
            DECLARE evidence_shop BIGINT;
            BEGIN
                SELECT shop_id INTO proposal_shop FROM savdograph_decision_proposal WHERE id = NEW.proposal_id;
                SELECT shop_id INTO evidence_shop FROM savdograph_evidence_item WHERE id = NEW.evidence_id;
                IF proposal_shop IS DISTINCT FROM evidence_shop THEN
                    RAISE EXCEPTION 'Proposal evidence must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
            END;
            $$
            """,
            """
            CREATE TRIGGER trg_sg_proposal_evidence_scope
            BEFORE INSERT OR UPDATE ON savdograph_proposal_evidence
            FOR EACH ROW EXECUTE FUNCTION savdograph_assert_proposal_evidence_scope()
            """,
            """
            CREATE OR REPLACE FUNCTION savdograph_assert_decision_scope()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            DECLARE proposal_shop BIGINT;
            BEGIN
                SELECT shop_id INTO proposal_shop FROM savdograph_decision_proposal WHERE id = NEW.proposal_id;
                IF proposal_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Proposal decision must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
            END;
            $$
            """,
            """
            CREATE TRIGGER trg_sg_decision_scope
            BEFORE INSERT OR UPDATE ON savdograph_proposal_decision
            FOR EACH ROW EXECUTE FUNCTION savdograph_assert_decision_scope()
            """);

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        if (!"PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            for (String sql : POSTGRESQL_STATEMENTS) {
                statement.execute(sql);
            }
        } catch (SQLException ex) {
            throw new SQLException("SavdoGraph PostgreSQL B1.1 hardening migration failed", ex);
        }
    }
}
