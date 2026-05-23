package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
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
import java.util.List;
import uz.barakat.market.domain.PaymentCategory;
import uz.barakat.market.dto.PaymentRequest;
import uz.barakat.market.dto.PaymentResponse;
import uz.barakat.market.dto.PaymentSummary;
import uz.barakat.market.service.PaymentService;

/** REST API for the payment journal ("To'lovlar jurnali"). */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    /** Journal entries for a date range (defaults to this month). */
    @GetMapping
    public PaymentSummary list(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate today = LocalDate.now();
        LocalDate start = from != null ? from : today.withDayOfMonth(1);
        LocalDate end = to != null ? to : today;
        return service.summary(start, end);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@Valid @RequestBody PaymentRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public PaymentResponse update(@PathVariable Long id,
                                  @Valid @RequestBody PaymentRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    /**
     * Distinct party names previously used for the given category. The
     * frontend uses this for the supplier / worker autocomplete in the
     * payment modal — mirrors the customer-list UX.
     */
    @GetMapping("/parties")
    public List<String> parties(@RequestParam PaymentCategory category) {
        return service.distinctParties(category);
    }
}
