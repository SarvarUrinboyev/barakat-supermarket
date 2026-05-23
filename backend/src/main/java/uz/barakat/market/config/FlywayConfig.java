package uz.barakat.market.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Always run {@code repair()} before {@code migrate()}. This cleans up
 * any failed-migration rows from {@code flyway_schema_history} left
 * behind by a previous launch — without it, the app can't recover from
 * a broken migration even after the SQL is fixed.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
