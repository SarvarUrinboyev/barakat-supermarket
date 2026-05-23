package uz.barakat.market.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.ExchangeRateResponse;
import uz.barakat.market.service.ExchangeRateService;

/** REST API for the daily USD -> UZS exchange rate. */
@RestController
@RequestMapping("/api/exchange-rate")
public class ExchangeRateController {

    private final ExchangeRateService service;

    public ExchangeRateController(ExchangeRateService service) {
        this.service = service;
    }

    @GetMapping
    public ExchangeRateResponse current() {
        return service.current();
    }
}
