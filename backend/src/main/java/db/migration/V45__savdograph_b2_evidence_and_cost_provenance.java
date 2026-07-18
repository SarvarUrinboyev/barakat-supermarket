package db.migration;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** B2 needs shop-wide evidence plus an auditable distinction for cost snapshots. */
public class V45__savdograph_b2_evidence_and_cost_provenance extends BaseJavaMigration {

    private static final String DROP_PRODUCT_NOT_NULL = """
            ALTER TABLE savdograph_evidence_item ALTER COLUMN product_id DROP NOT NULL
            """;

    private static final String ADD_COST_PROVENANCE = """
            ALTER TABLE sale_items ADD COLUMN cost_snapshot_provenance VARCHAR(32)
            NOT NULL DEFAULT 'LEGACY_OR_UNKNOWN'
            """;

    private static final String POSTGRES_EVIDENCE_TYPE_CONSTRAINT = """
            ALTER TABLE savdograph_evidence_item DROP CONSTRAINT ck_sg_evidence_type;
            ALTER TABLE savdograph_evidence_item ADD CONSTRAINT ck_sg_evidence_type
            CHECK (evidence_type IN (
                'REORDER_QUANTITY', 'PERIOD_TIMEZONE', 'REVENUE', 'REFUNDED_REVENUE',
                'COGS', 'GROSS_PROFIT', 'GROSS_MARGIN', 'SOURCE_RECORD_COUNT',
                'RESULT_CLASSIFICATION', 'REORDER_CURRENT_STOCK', 'REORDER_NET_UNITS_SOLD',
                'REORDER_VELOCITY', 'REORDER_COVERAGE_BEFORE', 'REORDER_COVERAGE_AFTER',
                'REORDER_STOCKOUT_RISK', 'REORDER_OVERSTOCK_RISK', 'REORDER_TIED_UP_CAPITAL'
            ))
            """;

    private static final String POSTGRES_EVIDENCE_SCOPE = """
            CREATE OR REPLACE FUNCTION savdograph_assert_evidence_scope()
            RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE reference_shop BIGINT;
            BEGIN
                SELECT shop_id INTO reference_shop FROM savdograph_analysis_run WHERE id = NEW.analysis_run_id;
                IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                    RAISE EXCEPTION 'Evidence analysis run must belong to the same shop' USING ERRCODE = '23514';
                END IF;
                IF NEW.product_id IS NOT NULL THEN
                    SELECT shop_id INTO reference_shop FROM products WHERE id = NEW.product_id;
                    IF reference_shop IS DISTINCT FROM NEW.shop_id THEN
                        RAISE EXCEPTION 'Evidence product must belong to the same shop' USING ERRCODE = '23514';
                    END IF;
                END IF;
                RETURN NEW;
            END;
            $$
            """;

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (Statement statement = connection.createStatement()) {
            statement.execute(DROP_PRODUCT_NOT_NULL);
            statement.execute(ADD_COST_PROVENANCE);
            if ("PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) {
                for (String sql : POSTGRES_EVIDENCE_TYPE_CONSTRAINT.split(";")) {
                    if (!sql.isBlank()) {
                        statement.execute(sql);
                    }
                }
                statement.execute(POSTGRES_EVIDENCE_SCOPE);
            }
        } catch (SQLException ex) {
            throw new SQLException("SavdoGraph B2 evidence migration failed", ex);
        }
    }
}
