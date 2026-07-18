package uz.barakat.market.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import uz.barakat.market.domain.DecisionProposalStatus;
import uz.barakat.market.domain.SavdoGraphResultClassification;

/** Dedicated public contract for the canonical B2 simulation-to-review bridge. */
public final class SavdoGraphProposalBridgeDtos {

    private SavdoGraphProposalBridgeDtos() {
    }

    /** Supplier ids are numeric in the existing domain; no other client authority is accepted. */
    @JsonIgnoreProperties(ignoreUnknown = false)
    public record CreateReviewProposalRequest(@NotNull Long supplierId) {

        @JsonAnySetter
        public void rejectUnknownField(String name, Object ignored) {
            throw new IllegalArgumentException("Unknown SavdoGraph proposal bridge field: " + name);
        }
    }

    public record CreateReviewProposalResponse(
            Long proposalId,
            DecisionProposalStatus proposalStatus,
            String sourceKind,
            Long sourceAnalysisRunId,
            Long productId,
            String productDisplayName,
            Long supplierId,
            String supplierDisplayName,
            int reorderQuantity,
            SavdoGraphResultClassification classification,
            List<String> assumptions,
            List<String> risks,
            List<String> limitations,
            List<Long> evidenceIds,
            LocalDateTime createdAt,
            boolean idempotent) {
    }
}