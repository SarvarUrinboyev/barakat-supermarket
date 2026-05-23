package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
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
import uz.barakat.market.dto.BulkImportRequest;
import uz.barakat.market.dto.BulkImportResult;
import uz.barakat.market.dto.BulkParseResult;
import uz.barakat.market.dto.HomeExpenseRequest;
import uz.barakat.market.dto.HomeExpenseResponse;
import uz.barakat.market.service.HomeExpenseService;

/** REST API for home / personal expenses. */
@RestController
@RequestMapping("/api/home-expenses")
public class HomeExpenseController {

    private final HomeExpenseService service;

    public HomeExpenseController(HomeExpenseService service) {
        this.service = service;
    }

    @GetMapping
    public List<HomeExpenseResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from != null && to != null) {
            return service.listByRange(from, to);
        }
        return service.listByDate(date != null ? date : LocalDate.now());
    }

    @GetMapping("/{id}")
    public HomeExpenseResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HomeExpenseResponse create(@Valid @RequestBody HomeExpenseRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public HomeExpenseResponse update(@PathVariable Long id,
                                      @Valid @RequestBody HomeExpenseRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping("/bulk-import/preview")
    public BulkParseResult preview(@Valid @RequestBody BulkImportRequest request) {
        return service.preview(request);
    }

    @PostMapping("/bulk-import")
    public BulkImportResult bulkImport(@Valid @RequestBody BulkImportRequest request) {
        return service.bulkImport(request);
    }
}
