package uz.barakat.market;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Barakat SuperMarket backend.
 *
 * <p>Provides the REST API consumed by the React dashboard, runs the
 * Flyway database migrations on startup and schedules the Telegram
 * reminder jobs.
 */
@SpringBootApplication
@EnableScheduling
@ConfigurationPropertiesScan
public class BarakatMarketApplication {

    public static void main(String[] args) {
        SpringApplication.run(BarakatMarketApplication.class, args);
    }
}
