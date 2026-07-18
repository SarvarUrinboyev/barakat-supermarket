package uz.barakat.market.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.SavdoGraphResultClassification;

/** Typed, deterministic B2 contracts kept separate from the frozen B1 DTOs. */
public final class SavdoGraphB2Dtos {

    private SavdoGraphB2Dtos() {
    }

    public record GrossProfitBriefRequest(
            @NotNull LocalDate periodStart,
            @NotNull LocalDate periodEnd) {
    }

    public record GrossProfitBriefResponse(
            Long analysisRunId,
            String label,
            SavdoGraphResultClassification classification,
            LocalDate periodStart,
            LocalDate periodEnd,
            String timezone,
            Currency currency,
            BigDecimal revenueUzs,
            BigDecimal cogsUzs,
            BigDecimal grossProfitUzs,
            BigDecimal grossMarginPercent,
            String grossMarginState,
            long completedSaleCount,
            long sourceSaleItemCount,
            BigDecimal refundedAmountUzs,
            List<String> assumptions,
            List<String> limitations,
            String calculationId,
            String calculationVersion,
            LocalDateTime generatedAt,
            Map<String, Long> evidenceIds) {
    }

    public record ReorderSimulationRequest(
            @NotNull Long productId,
            @NotNull LocalDate lookbackStart,
            @NotNull LocalDate lookbackEnd,
            @NotNull @Min(0) @Max(60) Integer leadTimeDays,
            @NotNull @Min(0) @Max(90) Integer safetyStockDays,
            @NotNull @Min(1) @Max(180) Integer forecastHorizonDays) {
    }

    public record ReorderSimulationResponse(
            Long analysisRunId,
            SavdoGraphResultClassification classification,
            Long productId,
            String productSku,
            String unit,
            int currentOnHandQuantity,
            LocalDate lookbackStart,
            LocalDate lookbackEnd,
            BigDecimal netUnitsSold,
            BigDecimal velocityUnitsPerDay,
            int leadTimeDays,
            int safetyStockDays,
            int forecastHorizonDays,
            Integer reorderQuantity,
            BigDecimal coverageBeforeDays,
            BigDecimal coverageAfterDays,
            String stockoutRisk,
            String overstockRisk,
            BigDecimal tiedUpCapitalUzs,
            String tiedUpCapitalState,
            List<String> assumptions,
            List<String> risks,
            List<String> limitations,
            String calculationId,
            String calculationVersion,
            LocalDateTime generatedAt,
            Map<String, Long> evidenceIds) {
    }
}
