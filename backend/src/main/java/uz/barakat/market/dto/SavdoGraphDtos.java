package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import uz.barakat.market.domain.AnalysisRunStatus;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.DecisionProposalStatus;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.domain.ProposalDecisionType;

/** Narrow, typed REST contracts for the SavdoGraph B1 backend boundary. */
public final class SavdoGraphDtos {

    private SavdoGraphDtos() {
    }

    public record AnalysisRunRequest(
            @NotBlank @Size(max = 64) String analysisType,
            @NotNull LocalDate periodFrom,
            @NotNull LocalDate periodTo) {
    }

    public record ReorderEvidenceRequest(
            @NotNull Long analysisRunId,
            @NotNull Long productId) {
    }

    public record ProposalRequest(
            @NotNull Long analysisRunId,
            @NotNull Long supplierId,
            @NotEmpty List<@NotNull Long> evidenceIds) {
    }

    public record DecisionRequest(
            @Size(max = 500) String reason,
            @NotBlank @Size(max = 120) String idempotencyKey) {
    }

    public record AnalysisRunResponse(
            Long id,
            String analysisType,
            LocalDate periodFrom,
            LocalDate periodTo,
            AnalysisRunStatus status,
            String initiatedBy,
            String toolVersion,
            String inputHash,
            LocalDateTime createdAt) {
    }

    public record EvidenceResponse(
            Long id,
            Long analysisRunId,
            Long productId,
            EvidenceType evidenceType,
            String sourceType,
            LocalDate periodFrom,
            LocalDate periodTo,
            String calculationId,
            String calculationVersion,
            String inputData,
            BigDecimal calculatedResult,
            String unit,
            Currency currency,
            String contentHash,
            String hashVersion,
            LocalDateTime createdAt) {
    }

    public record ProposalResponse(
            Long id,
            Long analysisRunId,
            Long productId,
            Long supplierId,
            String proposalType,
            int proposedReorderQuantity,
            String expectedImpact,
            String riskSummary,
            String assumptions,
            DecisionProposalStatus status,
            List<Long> evidenceIds,
            String evidenceHash,
            String createdBy,
            LocalDateTime createdAt) {
    }

    public record DecisionResponse(
            Long proposalId,
            ProposalDecisionType decision,
            DecisionProposalStatus proposalStatus,
            Long purchaseOrderId,
            boolean idempotent,
            LocalDateTime decidedAt) {
    }

    public record ActionLedgerResponse(
            Long id,
            Long proposalId,
            Long proposalDecisionId,
            String actor,
            String evidenceReferences,
            String eventType,
            String outcome,
            Long purchaseOrderId,
            String details,
            LocalDateTime createdAt) {
    }
}
