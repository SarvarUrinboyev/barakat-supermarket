package uz.barakat.market.service.savdograph.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.SavdoGraphResultClassification;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefResponse;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationResponse;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.service.savdograph.SavdoGraphB2Service;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ToolCall;

/** Executes only the three registered, bounded, tenant-filtered read-only B3 tools. */
@Service
public class StoreCopilotToolRegistry {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Tashkent");
    private static final Set<String> REGISTERED = Set.of(
            StoreCopilotSchemas.GROSS_PROFIT_TOOL,
            StoreCopilotSchemas.PRODUCT_SEARCH_TOOL,
            StoreCopilotSchemas.REORDER_TOOL);

    private final SavdoGraphB2Service b2;
    private final ProductRepository products;
    private final ObjectMapper mapper;

    public StoreCopilotToolRegistry(SavdoGraphB2Service b2, ProductRepository products, ObjectMapper mapper) {
        this.b2 = b2;
        this.products = products;
        this.mapper = mapper;
    }

    public Set<String> registeredToolNames() {
        return REGISTERED;
    }

    public InteractionState newInteraction() {
        return new InteractionState();
    }

    public void allowExplicitProduct(InteractionState state, Long productId) {
        if (productId == null) {
            return;
        }
        try {
            Product product = products.findById(productId)
                    .orElseThrow(() -> new ToolException("INVALID_TOOL_ARGUMENTS",
                            "Selected product is not available"));
            state.resolvedProductIds.add(product.getId());
            state.resolvedProductNames.put(product.getId(),
                    StoreCopilotPrivacy.sanitizeDisplayName(product.getName()));
        } catch (NotFoundException ex) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Selected product is not available");
        }
    }

    public ToolOutcome execute(ToolCall call, InteractionState state) {
        if (!REGISTERED.contains(call.name())) {
            throw new ToolException("UNKNOWN_TOOL", "Provider requested an unregistered tool");
        }
        JsonNode args = requireObject(call.arguments());
        ToolOutcome outcome;
        try {
            outcome = switch (call.name()) {
                case StoreCopilotSchemas.GROSS_PROFIT_TOOL -> grossProfit(args);
                case StoreCopilotSchemas.PRODUCT_SEARCH_TOOL -> searchProducts(args, state);
                case StoreCopilotSchemas.REORDER_TOOL -> reorder(args, state);
                default -> throw new ToolException("UNKNOWN_TOOL", "Provider requested an unregistered tool");
            };
        } catch (BadRequestException | NotFoundException ex) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Deterministic tool arguments are invalid");
        }
        state.toolsUsed.add(call.name());
        state.evidenceIds.addAll(outcome.evidenceIds());
        state.classificationByEvidence.putAll(outcome.classificationByEvidence());
        outcome.numbersByEvidence().forEach((id, values) ->
                state.numbersByEvidence.computeIfAbsent(id, ignored -> new HashSet<>()).addAll(values));
        outcome.unitsByEvidence().forEach((id, values) ->
                state.unitsByEvidence.computeIfAbsent(id, ignored -> new HashSet<>()).addAll(values));
        state.metadataTokens.addAll(outcome.metadataTokens());
        return outcome;
    }

    private ToolOutcome grossProfit(JsonNode args) {
        exactFields(args, "start_date", "end_date", "timezone");
        LocalDate start = date(args, "start_date");
        LocalDate end = date(args, "end_date");
        if (!"Asia/Tashkent".equals(text(args, "timezone", 40))) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Only Asia/Tashkent is supported");
        }
        GrossProfitBriefResponse result = b2.generateGrossProfitBrief(new GrossProfitBriefRequest(start, end));
        ObjectNode safe = mapper.createObjectNode();
        safe.put("period_start", result.periodStart().toString());
        safe.put("period_end", result.periodEnd().toString());
        safe.put("timezone", result.timezone());
        safe.put("currency", result.currency().name());
        putNullable(safe, "revenue", result.revenueUzs());
        putNullable(safe, "cogs", result.cogsUzs());
        putNullable(safe, "gross_profit", result.grossProfitUzs());
        putNullable(safe, "gross_margin_percent", result.grossMarginPercent());
        safe.put("gross_margin_state", result.grossMarginState());
        safe.put("completed_sale_count", result.completedSaleCount());
        safe.put("source_sale_item_count", result.sourceSaleItemCount());
        putNullable(safe, "refunded_amount", result.refundedAmountUzs());
        safe.put("calculation_version", result.calculationVersion());
        safe.set("assumptions", mapper.valueToTree(result.assumptions()));
        safe.set("limitations", mapper.valueToTree(result.limitations()));
        return deterministicOutcome(safe, result.evidenceIds(), result.classification(), Map.ofEntries(
                Map.entry("periodTimezone", List.of(result.periodStart(), result.periodEnd())),
                Map.entry("revenue", values(result.revenueUzs())),
                Map.entry("refundedRevenue", values(result.refundedAmountUzs())),
                Map.entry("cogs", values(result.cogsUzs())),
                Map.entry("grossProfit", values(result.grossProfitUzs())),
                Map.entry("grossMargin", values(result.grossMarginPercent())),
                Map.entry("sourceRecordCounts", List.of(result.completedSaleCount(), result.sourceSaleItemCount()))),
                Map.ofEntries(
                        Map.entry("revenue", Set.of(result.currency().name())),
                        Map.entry("refundedRevenue", Set.of(result.currency().name())),
                        Map.entry("cogs", Set.of(result.currency().name())),
                        Map.entry("grossProfit", Set.of(result.currency().name())),
                        Map.entry("grossMargin", Set.of("%"))),
                metadata(result.calculationVersion()));
    }

    private ToolOutcome searchProducts(JsonNode args, InteractionState state) {
        exactFields(args, "query", "limit");
        String query = text(args, "query", 120);
        int limit = integer(args, "limit", 1, 10);
        List<ProductCandidate> candidates = products
                .findByNameContainingIgnoreCaseOrBarcodeContainingIgnoreCaseOrderByNameAsc(
                        query, query, PageRequest.of(0, limit))
                .stream()
                .map(product -> new ProductCandidate(product.getId(),
                        StoreCopilotPrivacy.sanitizeDisplayName(product.getName()),
                        safeUnit(product.getUnit())))
                .toList();
        if (candidates.size() == 1) {
            ProductCandidate candidate = candidates.getFirst();
            state.resolvedProductIds.add(candidate.productId());
            state.resolvedProductNames.put(candidate.productId(), candidate.displayName());
        }
        ObjectNode output = mapper.createObjectNode();
        output.put("tool", StoreCopilotSchemas.PRODUCT_SEARCH_TOOL);
        output.put("deterministic", true);
        output.put("read_only", true);
        output.put("ambiguous", candidates.size() > 1);
        output.set("candidates", mapper.valueToTree(candidates));
        output.set("evidence_ids", mapper.createArrayNode());
        return new ToolOutcome(output, Set.of(), Map.of(), Map.of(), Map.of(), Set.of());
    }

    private ToolOutcome reorder(JsonNode args, InteractionState state) {
        exactFields(args, "product_id", "lookback_days", "lead_time_days", "safety_stock_days",
                "forecast_horizon_days");
        long productId = longInteger(args, "product_id", 1, Long.MAX_VALUE);
        if (!state.resolvedProductIds.contains(productId)) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS",
                    "Product must be resolved unambiguously in this tenant interaction before simulation");
        }
        int lookbackDays = integer(args, "lookback_days", 1, 90);
        int leadTimeDays = integer(args, "lead_time_days", 0, 60);
        int safetyStockDays = integer(args, "safety_stock_days", 0, 90);
        int horizonDays = integer(args, "forecast_horizon_days", 1, 180);
        LocalDate endExclusive = LocalDate.now(BUSINESS_ZONE).plusDays(1);
        LocalDate startInclusive = endExclusive.minusDays(lookbackDays);
        ReorderSimulationResponse result = b2.runReorderSimulation(new ReorderSimulationRequest(
                productId, startInclusive, endExclusive, leadTimeDays, safetyStockDays, horizonDays));
        ObjectNode safe = mapper.createObjectNode();
        safe.put("product_name", state.resolvedProductNames.getOrDefault(productId, "selected product"));
        safe.put("unit", safeUnit(result.unit()));
        safe.put("lookback_start", result.lookbackStart().toString());
        safe.put("lookback_end", result.lookbackEnd().toString());
        safe.put("current_stock", result.currentOnHandQuantity());
        putNullable(safe, "net_units_sold", result.netUnitsSold());
        putNullable(safe, "velocity_units_per_day", result.velocityUnitsPerDay());
        safe.put("lead_time_days", result.leadTimeDays());
        safe.put("safety_stock_days", result.safetyStockDays());
        safe.put("forecast_horizon_days", result.forecastHorizonDays());
        safe.put("reorder_quantity", result.reorderQuantity());
        putNullable(safe, "coverage_before_days", result.coverageBeforeDays());
        putNullable(safe, "coverage_after_days", result.coverageAfterDays());
        safe.put("stockout_risk", result.stockoutRisk());
        safe.put("overstock_risk", result.overstockRisk());
        safe.put("tied_up_capital_state", result.tiedUpCapitalState());
        safe.set("assumptions", mapper.valueToTree(result.assumptions()));
        safe.set("risks", mapper.valueToTree(result.risks()));
        safe.set("limitations", mapper.valueToTree(result.limitations()));
        return deterministicOutcome(safe, result.evidenceIds(), result.classification(), Map.ofEntries(
                Map.entry("periodTimezone", List.of(result.lookbackStart(), result.lookbackEnd())),
                Map.entry("currentStock", values(result.currentOnHandQuantity())),
                Map.entry("netUnitsSold", values(result.netUnitsSold())),
                Map.entry("velocity", values(result.velocityUnitsPerDay())),
                Map.entry("reorderQuantity", List.of(result.reorderQuantity(), result.leadTimeDays(),
                        result.safetyStockDays(), result.forecastHorizonDays())),
                Map.entry("coverageBefore", values(result.coverageBeforeDays())),
                Map.entry("coverageAfter", values(result.coverageAfterDays())),
                Map.entry("stockoutRisk", values(result.coverageBeforeDays())),
                Map.entry("overstockRisk", values(result.coverageAfterDays()))),
                Map.of(), Set.of());
    }

    private ToolOutcome deterministicOutcome(ObjectNode result, Map<String, Long> evidenceIds,
                                             SavdoGraphResultClassification classification,
                                             Map<String, List<?>> valuesByEvidenceName,
                                             Map<String, Set<String>> unitsByEvidenceName,
                                             Set<String> metadataTokens) {
        ObjectNode output = mapper.createObjectNode();
        output.put("deterministic", true);
        output.put("read_only", true);
        output.put("classification", classification.name());
        output.set("result", result);
        output.set("evidence_by_field", mapper.valueToTree(evidenceIds));
        output.set("evidence_ids", mapper.valueToTree(evidenceIds.values().stream().sorted().toList()));
        Set<Long> ids = Set.copyOf(evidenceIds.values());
        Map<Long, Set<String>> numbersByEvidence = new HashMap<>();
        Map<Long, SavdoGraphResultClassification> classifications = new HashMap<>();
        Map<Long, Set<String>> unitsByEvidence = new HashMap<>();
        ids.forEach(id -> classifications.put(id, classification));
        valuesByEvidenceName.forEach((name, values) -> {
            Long evidenceId = evidenceIds.get(name);
            if (evidenceId == null) {
                return;
            }
            Set<String> supported = numbersByEvidence.computeIfAbsent(evidenceId, ignored -> new HashSet<>());
            values.forEach(value -> addSupportedValue(supported, value));
        });
        unitsByEvidenceName.forEach((name, units) -> {
            Long evidenceId = evidenceIds.get(name);
            if (evidenceId != null) {
                unitsByEvidence.put(evidenceId, Set.copyOf(units));
            }
        });
        return new ToolOutcome(output, ids, immutableSets(numbersByEvidence), Map.copyOf(classifications),
                immutableSets(unitsByEvidence), Set.copyOf(metadataTokens));
    }

    private static Map<Long, Set<String>> immutableSets(Map<Long, Set<String>> source) {
        Map<Long, Set<String>> result = new HashMap<>();
        source.forEach((id, values) -> result.put(id, Set.copyOf(values)));
        return Map.copyOf(result);
    }

    private static Set<String> metadata(String value) {
        return value == null || value.isBlank() ? Set.of() : Set.of(value);
    }

    private static List<?> values(Object value) {
        return value == null ? List.of() : List.of(value);
    }

    private static void addSupportedValue(Set<String> target, Object value) {
        if (value instanceof Number number) {
            target.add(normalize(new BigDecimal(number.toString())));
        } else if (value instanceof LocalDate date) {
            target.add(date.toString());
        }
    }

    private static void putNullable(ObjectNode node, String field, Object value) {
        if (value == null) {
            node.putNull(field);
        } else if (value instanceof BigDecimal decimal) {
            node.put(field, decimal);
        } else if (value instanceof Number number) {
            node.put(field, number.longValue());
        } else {
            node.put(field, value.toString());
        }
    }

    private static String safeUnit(String unit) {
        String safe = StoreCopilotPrivacy.sanitizeDisplayName(unit == null ? "" : unit);
        return safe.length() <= 24 ? safe : safe.substring(0, 24);
    }

    private static String normalize(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
    private static JsonNode requireObject(JsonNode args) {
        if (args == null || !args.isObject()) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Tool arguments must be an object");
        }
        return args;
    }

    private static void exactFields(JsonNode args, String... names) {
        Set<String> actual = new HashSet<>();
        args.fieldNames().forEachRemaining(actual::add);
        if (!actual.equals(Set.of(names))) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Tool arguments do not match the strict schema");
        }
    }

    private static String text(JsonNode args, String field, int maxLength) {
        JsonNode value = args.get(field);
        if (value == null || !value.isTextual() || value.asText().isBlank() || value.asText().length() > maxLength) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Invalid " + field);
        }
        return value.asText();
    }

    private static LocalDate date(JsonNode args, String field) {
        try {
            return LocalDate.parse(text(args, field, 10));
        } catch (RuntimeException ex) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Invalid ISO date for " + field);
        }
    }

    private static int integer(JsonNode args, String field, int min, int max) {
        long value = longInteger(args, field, min, max);
        return Math.toIntExact(value);
    }

    private static long longInteger(JsonNode args, String field, long min, long max) {
        JsonNode value = args.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToLong()) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Invalid " + field);
        }
        long number = value.longValue();
        if (number < min || number > max) {
            throw new ToolException("INVALID_TOOL_ARGUMENTS", "Out-of-range " + field);
        }
        return number;
    }

    public static final class InteractionState {
        private final Set<Long> resolvedProductIds = new HashSet<>();
        private final Map<Long, String> resolvedProductNames = new HashMap<>();
        private final Set<Long> evidenceIds = new LinkedHashSet<>();
        private final Map<Long, Set<String>> numbersByEvidence = new HashMap<>();
        private final Map<Long, Set<String>> unitsByEvidence = new HashMap<>();
        private final Map<Long, SavdoGraphResultClassification> classificationByEvidence = new HashMap<>();
        private final List<String> toolsUsed = new ArrayList<>();
        private final Set<String> metadataTokens = new HashSet<>();

        public Set<Long> evidenceIds() {
            return Set.copyOf(evidenceIds);
        }

        public Map<Long, Set<String>> numbersByEvidence() {
            return Map.copyOf(numbersByEvidence);
        }

        public Map<Long, Set<String>> unitsByEvidence() {
            return Map.copyOf(unitsByEvidence);
        }

        public Map<Long, SavdoGraphResultClassification> classificationByEvidence() {
            return Map.copyOf(classificationByEvidence);
        }

        public List<String> toolsUsed() {
            return List.copyOf(toolsUsed);
        }

        public Set<String> metadataTokens() {
            return Set.copyOf(metadataTokens);
        }
    }

    public record ToolOutcome(
            JsonNode output,
            Set<Long> evidenceIds,
            Map<Long, Set<String>> numbersByEvidence,
            Map<Long, SavdoGraphResultClassification> classificationByEvidence,
            Map<Long, Set<String>> unitsByEvidence,
            Set<String> metadataTokens) {
    }

    private record ProductCandidate(Long productId, String displayName, String unit) {
    }

    public static class ToolException extends RuntimeException {
        private final String code;

        public ToolException(String code, String message) {
            super(message);
            this.code = code;
        }

        public String code() {
            return code;
        }
    }
}
