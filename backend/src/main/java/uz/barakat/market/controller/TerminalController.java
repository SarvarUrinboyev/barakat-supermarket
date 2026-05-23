package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.TerminalRequest;
import uz.barakat.market.dto.TerminalResponse;
import uz.barakat.market.service.TerminalService;

/** REST API for the daily Humo / UzCard terminal totals. */
@RestController
@RequestMapping("/api/terminal")
public class TerminalController {

    private final TerminalService service;

    public TerminalController(TerminalService service) {
        this.service = service;
    }

    @GetMapping("/today")
    public TerminalResponse today() {
        return service.today();
    }

    @GetMapping("/history")
    public List<TerminalResponse> history() {
        return service.recent();
    }

    @GetMapping
    public TerminalResponse forDate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.forDate(date != null ? date : LocalDate.now());
    }

    @PostMapping
    public TerminalResponse save(@Valid @RequestBody TerminalRequest request) {
        return service.save(request);
    }
}
