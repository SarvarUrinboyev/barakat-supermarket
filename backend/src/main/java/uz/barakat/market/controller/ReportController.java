package uz.barakat.market.controller;

import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import uz.barakat.market.dto.EndOfDayReport;
import uz.barakat.market.service.AnalyticsService;
import uz.barakat.market.service.ReportPdfService;
import uz.barakat.market.service.ReportService;
import uz.barakat.market.service.StockAlertService;

/**
 * REST API for reports.
 *
 * <ul>
 *   <li>{@code /api/report/end-of-day} — JSON used by the Telegram bot.</li>
 *   <li>{@code /api/report/pdf/*} — branded PDF downloads (Phase 4.1).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/report")
public class ReportController {

    private final ReportService service;
    private final ReportPdfService pdf;
    private final StockAlertService stockAlertService;
    private final AnalyticsService analytics;

    public ReportController(ReportService service, ReportPdfService pdf,
                            StockAlertService stockAlertService,
                            AnalyticsService analytics) {
        this.service = service;
        this.pdf = pdf;
        this.stockAlertService = stockAlertService;
        this.analytics = analytics;
    }

    /**
     * Per-product profit + revenue + margin for the given window.
     * Defaults to the last 30 days when from/to are omitted.
     */
    @GetMapping("/profit-by-product")
    public List<AnalyticsService.ProductProfitRow> profitByProduct(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analytics.profitByProduct(from, to);
    }

    /**
     * 24-hour heatmap of SALE-movement counts for the window. Always
     * returns 24 entries (hour=0..23) — zero buckets included so the
     * frontend can render a fixed grid without padding logic.
     */
    @GetMapping("/hourly-sales")
    public List<AnalyticsService.HourlySalesBucket> hourlySales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analytics.hourlySales(from, to);
    }

    @GetMapping("/end-of-day")
    public EndOfDayReport endOfDay(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.forDate(date != null ? date : LocalDate.now());
    }

    @PostMapping("/send-telegram")
    public EndOfDayReport sendTelegram(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.sendToTelegram(date != null ? date : LocalDate.now());
    }

    /**
     * On-demand low-stock check: runs the same audit as the 09:00 cron and
     * sends a Telegram alert if any products are below their threshold.
     *
     * @return number of low-stock products found, or 0 when everything is fine
     */
    @PostMapping("/stock-alert")
    public ResponseEntity<String> triggerStockAlert() {
        int count = stockAlertService.checkAndAlert();
        String body = count == 0
                ? "Barcha tovarlar yetarli zaxirada."
                : count + " ta tovar kam qoldiq — Telegram xabari yuborildi.";
        return ResponseEntity.ok(body);
    }

    // ============================================================ PDF

    @GetMapping("/pdf/sales")
    public ResponseEntity<byte[]> salesPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return pdfResponse(
                "savdo-hisoboti-" + dateTag(from, to) + ".pdf",
                pdf.salesReport(from, to));
    }

    @GetMapping("/pdf/inventory")
    public ResponseEntity<byte[]> inventoryPdf(
            @RequestParam(required = false) String shopLabel) {
        return pdfResponse(
                "ombor-hisoboti-" + LocalDate.now() + ".pdf",
                pdf.inventoryReport(shopLabel));
    }

    @GetMapping("/pdf/customer/{id}/ledger")
    public ResponseEntity<byte[]> customerLedgerPdf(@PathVariable Long id) {
        return pdfResponse(
                "mijoz-tarixi-" + id + "-" + LocalDate.now() + ".pdf",
                pdf.customerLedger(id));
    }

    // ------------------------------------------------------------ helpers

    /**
     * Wrap the rendered bytes in a download response. {@code attachment}
     * forces the browser / Electron print pipeline to save the file
     * instead of rendering it inline (which loses our header band on
     * some PDF viewers).
     */
    private static ResponseEntity<byte[]> pdfResponse(String fileName, byte[] body) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"")
                .body(body);
    }

    private static String dateTag(LocalDate from, LocalDate to) {
        if (from == null && to == null) return LocalDate.now().toString();
        if (from != null && to != null && from.equals(to)) return from.toString();
        return (from == null ? "x" : from.toString())
                + "-"
                + (to == null ? "x" : to.toString());
    }
}
