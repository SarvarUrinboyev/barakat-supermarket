package uz.barakat.market.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalRequest;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalResponse;
import uz.barakat.market.service.savdograph.SavdoGraphProposalBridgeService;

/** Dedicated, server-derived bridge from one canonical B2 simulation to B1 human review. */
@RestController
@RequestMapping("/api/savdograph")
public class SavdoGraphProposalBridgeController {

    private final SavdoGraphProposalBridgeService service;

    public SavdoGraphProposalBridgeController(SavdoGraphProposalBridgeService service) {
        this.service = service;
    }

    @PostMapping("/reorder-simulations/{analysisRunId}/proposals")
    public ResponseEntity<CreateReviewProposalResponse> create(
            @PathVariable Long analysisRunId,
            @Valid @RequestBody CreateReviewProposalRequest request) {
        CreateReviewProposalResponse response = service.create(analysisRunId, request);
        return ResponseEntity.status(response.idempotent() ? HttpStatus.OK : HttpStatus.CREATED).body(response);
    }
}