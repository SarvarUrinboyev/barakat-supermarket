package db.migration;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Replace the global {@code UNIQUE} constraint on {@code day_balance.date}
 * (declared inline in V1__init_schema.sql) with a composite
 * {@code (shop_id, date)} unique index.
 *
 * <p>The original schema was single-tenant — one row per date covered the
 * whole shop. V14 added a {@code shop_id} column to scope rows per shop,
 * but the unique constraint on date was never widened. The result: as
 * soon as shop B tries to record its opening balance for a date that
 * shop A already touched, the insert fails with
 * <em>{@code Unique index or primary key violation}</em>.
 *
 * <p>The constraint is named dynamically by H2 (e.g.
 * {@code CONSTRAINT_45_INDEX_8}), so we cannot drop it by a hard-coded
 * name. A Java migration lets us query {@code INFORMATION_SCHEMA} at
 * runtime and drop whatever name was actually allocated.
 */
public class V15__day_balance_per_shop_unique extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection conn = context.getConnection();
        try (Statement st = conn.createStatement()) {
            // 1. Drop every non-PK unique constraint on day_balance. There
            //    should only be one (the inline UNIQUE on `date`) but we
            //    loop to be robust against pre-existing experiments.
            try (ResultSet rs = st.executeQuery(
                    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS "
                            + "WHERE UPPER(TABLE_NAME) = 'DAY_BALANCE' "
                            + "  AND CONSTRAINT_TYPE = 'UNIQUE'")) {
                while (rs.next()) {
                    String name = rs.getString(1);
                    // ALTER TABLE ... DROP CONSTRAINT works in both H2 and
                    // PostgreSQL — and the IF EXISTS guard means re-running
                    // a partially-applied migration is safe.
                    try (Statement drop = conn.createStatement()) {
                        drop.execute("ALTER TABLE day_balance DROP CONSTRAINT IF EXISTS \""
                                + name + "\"");
                    }
                }
            }

            // 2. Add the composite uniqueness as a separate index (works on
            //    both H2 and Postgres and survives further column changes
            //    better than an inline UNIQUE constraint).
            st.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_day_balance_shop_date "
                    + "ON day_balance(shop_id, date)");
        }
    }
}
