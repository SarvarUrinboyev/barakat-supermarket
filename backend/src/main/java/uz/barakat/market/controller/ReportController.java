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
import uz.barakat.market.dto.EndOfDayReport;
import uz.barakat.market.service.ReportPdfService;
import uz.barakat.market.service.ReportService;

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

    public ReportController(ReportService service, ReportPdfService pdf) {
        this.service = service;
        this.pdf = pdf;
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
