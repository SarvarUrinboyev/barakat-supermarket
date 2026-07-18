package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.domain.ProposalDecisionType;
import uz.barakat.market.dto.SavdoGraphDtos.ActionLedgerResponse;
import uz.barakat.market.dto.SavdoGraphDtos.AnalysisRunRequest;
import uz.barakat.market.dto.SavdoGraphDtos.AnalysisRunResponse;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionRequest;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionResponse;
import uz.barakat.market.dto.SavdoGraphDtos.EvidenceResponse;
import uz.barakat.market.dto.SavdoGraphDtos.ProposalRequest;
import uz.barakat.market.dto.SavdoGraphDtos.ProposalResponse;
import uz.barakat.market.dto.SavdoGraphDtos.ReorderEvidenceRequest;
import uz.barakat.market.service.savdograph.SavdoGraphService;

/** Tenant-scoped SavdoGraph B1 contract; all permissions are enforced in SecurityConfig. */
@RestController
@RequestMapping("/api/savdograph")
public class SavdoGraphController {

    private final SavdoGraphService service;

    public SavdoGraphController(SavdoGraphService service) {
        this.service = service;
    }

    @PostMapping("/analysis-runs")
    @ResponseStatus(HttpStatus.CREATED)
    public AnalysisRunResponse createAnalysisRun(@Valid @RequestBody AnalysisRunRequest request) {
        return service.createAnalysisRun(request);
    }

    @GetMapping("/analysis-runs")
    public List<AnalysisRunResponse> listAnalysisRuns() {
        return service.listAnalysisRuns();
    }

    @GetMapping("/analysis-runs/{id}")
    public AnalysisRunResponse getAnalysisRun(@PathVariable Long id) {
        return service.getAnalysisRun(id);
    }

    /** Creates the only B1 numeric evidence: a server-calculated low-stock reorder quantity. */
    @PostMapping("/evidence-items/reorder-quantity")
    @ResponseStatus(HttpStatus.CREATED)
    public EvidenceResponse createReorderEvidence(@Valid @RequestBody ReorderEvidenceRequest request) {
        return service.createReorderEvidence(request);
    }

    @GetMapping("/evidence-items")
    public List<EvidenceResponse> listEvidence() {
        return service.listEvidence();
    }

    @GetMapping("/evidence-items/{id}")
    public EvidenceResponse getEvidence(@PathVariable Long id) {
        return service.getEvidence(id);
    }

    @PostMapping("/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    public ProposalResponse createProposal(@Valid @RequestBody ProposalRequest request) {
        return service.createProposal(request);
    }

    @GetMapping("/proposals")
    public List<ProposalResponse> listProposals() {
        return service.listProposals();
    }

    @GetMapping("/proposals/{id}")
    public ProposalResponse getProposal(@PathVariable Long id) {
        return service.getProposal(id);
    }

    @PostMapping("/proposals/{id}/approve")
    public DecisionResponse approve(@PathVariable Long id, @Valid @RequestBody DecisionRequest request) {
        return service.decide(id, ProposalDecisionType.APPROVE, request);
    }

    @PostMapping("/proposals/{id}/reject")
    public DecisionResponse reject(@PathVariable Long id, @Valid @RequestBody DecisionRequest request) {
        return service.decide(id, ProposalDecisionType.REJECT, request);
    }

    @GetMapping("/action-ledger")
    public List<ActionLedgerResponse> actionLedger() {
        return service.listLedger();
    }
}
