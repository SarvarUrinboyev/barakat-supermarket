package uz.barakat.market.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import uz.barakat.market.domain.SavdoGraphResultClassification;

/** Public, reasoning-free API contracts for the B3 grounded store copilot. */
public final class SavdoGraphB3Dtos {

    private SavdoGraphB3Dtos() {
    }

    public enum RequestedLocale {
        AUTO, UZ, RU, EN
    }

    public enum CopilotStatus {
        ANSWERED,
        NEEDS_CLARIFICATION,
        INSUFFICIENT_DATA,
        UNSUPPORTED,
        PROVIDER_UNAVAILABLE,
        REFUSED,
        ERROR,
        GROUNDEDNESS_VALIDATION_FAILED
    }

    public enum CopilotLanguage {
        uz, ru, en
    }

    public enum SuggestedActionType {
        VIEW_EVIDENCE, RUN_SIMULATION, REVIEW_PROPOSAL, ASK_CLARIFICATION
    }

    public enum CopilotErrorCode {
        PROVIDER_UNAVAILABLE,
        PROVIDER_TIMEOUT,
        PROVIDER_RATE_LIMIT,
        PROVIDER_NETWORK_ERROR,
        PROVIDER_INCOMPLETE,
        PROVIDER_REFUSAL,
        INVALID_STRUCTURED_OUTPUT,
        UNKNOWN_TOOL,
        INVALID_TOOL_ARGUMENTS,
        TOOL_LIMIT_EXCEEDED,
        TOOL_EXECUTION_FAILED,
        GROUNDEDNESS_VALIDATION_FAILED
    }

    /**
     * Authority is deliberately absent. Every optional value is a bounded,
     * owner-visible hint; the authenticated tenant always comes from server context.
     */
    @JsonIgnoreProperties(ignoreUnknown = false)
    public record AskStoreRequest(
            @NotBlank @Size(max = 1200) String question,
            @NotNull RequestedLocale locale,
            LocalDate periodStart,
            LocalDate periodEnd,
            @Positive Long productId,
            @Min(1) @Max(90) Integer lookbackDays,
            @Min(1) @Max(180) Integer forecastHorizonDays,
            @Min(0) @Max(60) Integer leadTimeDays,
            @Min(0) @Max(90) Integer safetyStockDays) {

        @JsonAnySetter
        public void rejectUnknownField(String name, Object ignored) {
            throw new IllegalArgumentException("Unknown SavdoGraph ask field: " + name);
        }

        @AssertTrue(message = "periodStart and periodEnd must form a start-inclusive, end-exclusive period of at most 31 days")
        public boolean isPeriodValid() {
            if (periodStart == null && periodEnd == null) {
                return true;
            }
            return periodStart != null && periodEnd != null
                    && periodEnd.isAfter(periodStart)
                    && !periodEnd.isAfter(periodStart.plusDays(31));
        }
    }

    public record CopilotFact(
            String label,
            String value,
            String unit,
            @JsonProperty("evidence_ids") List<Long> evidenceIds,
            SavdoGraphResultClassification classification) {
    }

    public record SuggestedNextAction(
            SuggestedActionType type,
            String label,
            @JsonProperty("requires_human_action") boolean requiresHumanAction) {
    }

    /** Model-authored content before safe server metadata is attached. */
    public record StructuredCopilotResult(
            CopilotStatus status,
            CopilotLanguage language,
            String answer,
            SavdoGraphResultClassification classification,
            List<CopilotFact> facts,
            List<String> assumptions,
            List<String> limitations,
            @JsonProperty("tools_used") List<String> toolsUsed,
            @JsonProperty("evidence_ids") List<Long> evidenceIds,
            @JsonProperty("suggested_next_actions") List<SuggestedNextAction> suggestedNextActions) {
    }

    /** Public endpoint response. No raw provider request, protocol, key, or reasoning. */
    public record AskStoreResponse(
            String interactionId,
            String model,
            String promptVersion,
            CopilotStatus status,
            CopilotErrorCode errorCode,
            CopilotLanguage language,
            String answer,
            SavdoGraphResultClassification classification,
            List<CopilotFact> facts,
            List<String> assumptions,
            List<String> limitations,
            List<String> toolsUsed,
            List<Long> evidenceIds,
            List<SuggestedNextAction> suggestedNextActions,
            Long providerLatencyMs,
            LocalDateTime generatedAt) {
    }
}
