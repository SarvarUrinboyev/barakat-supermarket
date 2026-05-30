package db.migration;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Widen two more stale single-column {@code UNIQUE} constraints to be
 * per-shop — exactly the fix V15 applied to {@code day_balance}, which was
 * never extended to its siblings:
 * <ul>
 *   <li>{@code categories.name}        &rarr; {@code (shop_id, name)}</li>
 *   <li>{@code terminal_balances.date} &rarr; {@code (shop_id, date)}</li>
 * </ul>
 *
 * <p>V3 declared {@code categories.name UNIQUE} and V1 declared
 * {@code terminal_balances.date UNIQUE} while the app was single-tenant.
 * V14 added {@code shop_id} but never widened these constraints, so a
 * second shop reusing a category name (e.g. "Smartfonlar") or recording
 * terminal totals for a date another shop already used hits a unique
 * violation.
 *
 * <p>The constraint names are DB-assigned, so (like V15) we resolve them at
 * runtime from the SQL-standard {@code INFORMATION_SCHEMA.TABLE_CONSTRAINTS}
 * — present in both H2 and PostgreSQL — and drop them before creating the
 * composite unique indexes.
 */
public class V22__more_per_shop_unique_constraints extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection conn = context.getConnection();
        dropSingleColumnUniques(conn, "CATEGORIES");
        dropSingleColumnUniques(conn, "TERMINAL_BALANCES");
        try (Statement st = conn.createStatement()) {
            st.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_categories_shop_name "
                    + "ON categories(shop_id, name)");
            st.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_terminal_balances_shop_date "
                    + "ON terminal_balances(shop_id, date)");
        }
    }

    /**
     * Drops every non-PK UNIQUE constraint on {@code table}. Each of these
     * tables has exactly one (the inline single-column UNIQUE); the loop is
     * defensive and the {@code IF EXISTS} guard keeps a re-applied migration
     * safe. {@code ALTER TABLE ... DROP CONSTRAINT} works on both H2 and
     * PostgreSQL.
     */
    private static void dropSingleColumnUniques(Connection conn, String table) throws Exception {
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(
                     "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS "
                             + "WHERE UPPER(TABLE_NAME) = '" + table + "' "
                             + "  AND CONSTRAINT_TYPE = 'UNIQUE'")) {
            while (rs.next()) {
                String name = rs.getString(1);
                try (Statement drop = conn.createStatement()) {
                    drop.execute("ALTER TABLE " + table
                            + " DROP CONSTRAINT IF EXISTS \"" + name + "\"");
                }
            }
        }
    }
}
