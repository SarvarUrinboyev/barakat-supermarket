package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.BalanceRequest;
import uz.barakat.market.dto.BalanceResponse;
import uz.barakat.market.service.BalanceService;

/** REST API for the morning cash balance. */
@RestController
@RequestMapping("/api/balance")
public class BalanceController {

    private final BalanceService service;

    public BalanceController(BalanceService service) {
        this.service = service;
    }

    @GetMapping("/today")
    public BalanceResponse today() {
        return service.today();
    }

    @GetMapping
    public BalanceResponse forDate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.forDate(date != null ? date : LocalDate.now());
    }

    @PostMapping
    public BalanceResponse set(@Valid @RequestBody BalanceRequest request) {
        return service.set(request);
    }
}
