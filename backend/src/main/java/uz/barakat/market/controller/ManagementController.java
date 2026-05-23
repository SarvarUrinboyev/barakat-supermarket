package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.ManagementCostRequest;
import uz.barakat.market.dto.ManagementCostResponse;
import uz.barakat.market.dto.ManagementSummary;
import uz.barakat.market.dto.SoldGoodsReport;
import uz.barakat.market.service.ManagementService;
import uz.barakat.market.service.SoldGoodsExporter;

/** REST API for the Management page ("Menejment"). */
@RestController
@RequestMapping("/api/management")
public class ManagementController {

    private final ManagementService service;
    private final SoldGoodsExporter exporter;

    public ManagementController(ManagementService service, SoldGoodsExporter exporter) {
        this.service = service;
        this.exporter = exporter;
    }

    /** Sales / profit summary for a date range (defaults to this month). */
    @GetMapping("/summary")
    public ManagementSummary summary(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate start = from != null ? from : today.withDayOfMonth(1);
        LocalDate end = to != null ? to : today;
        return service.summary(start, end);
    }

    /** Sold-goods list for a date range (defaults to this month) — JSON. */
    @GetMapping("/sold-goods")
    public SoldGoodsReport soldGoods(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate start = from != null ? from : today.withDayOfMonth(1);
        LocalDate end = to != null ? to : today;
        return service.soldGoods(start, end);
    }

    /** Downloads the sold-goods list for a date range as a CSV or XLSX file. */
    @GetMapping("/sold-goods/export")
    public ResponseEntity<byte[]> exportSoldGoods(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) {
        LocalDate today = LocalDate.now();
        LocalDate start = from != null ? from : today.withDayOfMonth(1);
        LocalDate end = to != null ? to : today;
        SoldGoodsReport report = service.soldGoods(start, end);

        boolean xlsx = "xlsx".equalsIgnoreCase(format);
        byte[] body = xlsx ? exporter.toXlsx(report) : exporter.toCsv(report);
        String filename = "sotilgan-tovarlar-" + start + "_" + end
                + (xlsx ? ".xlsx" : ".csv");
        MediaType type = xlsx
                ? MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                : MediaType.parseMediaType("text/csv; charset=UTF-8");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(type)
                .body(body);
    }

    @PostMapping("/costs")
    @ResponseStatus(HttpStatus.CREATED)
    public ManagementCostResponse createCost(@Valid @RequestBody ManagementCostRequest request) {
        return service.createCost(request);
    }

    @PutMapping("/costs/{id}")
    public ManagementCostResponse updateCost(@PathVariable Long id,
                                             @Valid @RequestBody ManagementCostRequest request) {
        return service.updateCost(id, request);
    }

    @DeleteMapping("/costs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCost(@PathVariable Long id) {
        service.deleteCost(id);
    }
}
