package uz.barakat.market.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Product;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.telegram.TelegramService;

/**
 * Daily low-stock audit: scans every product whose quantity is at or
 * below its configured {@code lowStockThreshold} and sends a single
 * consolidated Telegram message. Triggered by a cron schedule AND
 * available for on-demand calls via the REST API.
 */
@Service
@Transactional(readOnly = true)
public class StockAlertService {

    private static final Logger log = LoggerFactory.getLogger(StockAlertService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final ProductRepository products;
    private final TelegramService telegram;

    public StockAlertService(ProductRepository products, TelegramService telegram) {
        this.products = products;
        this.telegram = telegram;
    }

    /**
     * Queries for low-stock products and, if any are found, sends one
     * consolidated Telegram message listing them all. Safe to call from
     * the scheduler or from an HTTP endpoint — never throws.
     *
     * @return number of low-stock products found (0 = nothing to alert)
     */
    public int checkAndAlert() {
        List<Product> lowStock;
        try {
            lowStock = products.findLowStockProducts();
        } catch (RuntimeException ex) {
            log.error("Low-stock query failed: {}", ex.toString());
            return 0;
        }

        if (lowStock.isEmpty()) {
            log.info("Low-stock check: all products are adequately stocked.");
            return 0;
        }

        log.info("Low-stock check: {} product(s) below threshold.", lowStock.size());
        String message = buildMessage(lowStock);
        try {
            telegram.sendMessage(message);
        } catch (RuntimeException ex) {
            // Never let an alert failure bubble up to the caller.
            log.warn("Low-stock Telegram alert failed: {}", ex.toString());
        }
        return lowStock.size();
    }

    // ---------------------------------------------------------------- private

    private static String buildMessage(List<Product> lowStock) {
        StringBuilder sb = new StringBuilder();
        sb.append("BARAKAT SUPERMARKET\n");
        sb.append("Kam qoldiq — ").append(LocalDate.now().format(DATE)).append("\n\n");

        for (Product p : lowStock) {
            String emoji = p.getQuantity() == 0 ? "🚨" : "⚠️";
            sb.append(emoji).append(' ').append(p.getName()).append('\n');
            sb.append("   Mavjud: ").append(p.getQuantity())
              .append(' ').append(safeUnit(p.getUnit())).append('\n');
            sb.append("   Minimum: ").append(p.getLowStockThreshold()).append('\n');
            if (p.getBarcode() != null && !p.getBarcode().isBlank()) {
                sb.append("   Barcode: ").append(p.getBarcode()).append('\n');
            }
            sb.append('\n');
        }

        sb.append("To'ldirishni rejalashtiring!");
        return sb.toString();
    }

    private static String safeUnit(String unit) {
        return unit == null || unit.isBlank() ? "dona" : unit;
    }
}
