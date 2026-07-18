package uz.barakat.market.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefResponse;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationResponse;
import uz.barakat.market.service.savdograph.SavdoGraphB2Service;

/** B2 is deterministic, tenant-scoped, and intentionally exposes no external side effect. */
@RestController
@RequestMapping("/api/savdograph")
public class SavdoGraphB2Controller {

    private final SavdoGraphB2Service service;

    public SavdoGraphB2Controller(SavdoGraphB2Service service) {
        this.service = service;
    }

    @PostMapping("/gross-profit-briefs")
    @ResponseStatus(HttpStatus.CREATED)
    public GrossProfitBriefResponse generateGrossProfitBrief(
            @Valid @RequestBody GrossProfitBriefRequest request) {
        return service.generateGrossProfitBrief(request);
    }

    @GetMapping("/gross-profit-briefs/{analysisRunId}")
    public GrossProfitBriefResponse getGrossProfitBrief(@PathVariable Long analysisRunId) {
        return service.getGrossProfitBrief(analysisRunId);
    }

    @PostMapping("/reorder-simulations")
    @ResponseStatus(HttpStatus.CREATED)
    public ReorderSimulationResponse runReorderSimulation(
            @Valid @RequestBody ReorderSimulationRequest request) {
        return service.runReorderSimulation(request);
    }

    @GetMapping("/reorder-simulations/{analysisRunId}")
    public ReorderSimulationResponse getReorderSimulation(@PathVariable Long analysisRunId) {
        return service.getReorderSimulation(analysisRunId);
    }
}
