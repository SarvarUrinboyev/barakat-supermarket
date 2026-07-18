package uz.barakat.market.service.savdograph;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.AnalysisRun;
import uz.barakat.market.domain.AnalysisRunStatus;
import uz.barakat.market.domain.CostSnapshotProvenance;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.Sale;
import uz.barakat.market.domain.SaleItem;
import uz.barakat.market.domain.SavdoGraphResultClassification;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefResponse;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationRequest;
import uz.barakat.market.dto.SavdoGraphB2Dtos.ReorderSimulationResponse;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.AnalysisRunRepository;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.SaleRepository;

/**
 * B2's deterministic backend boundary. It uses only sale snapshots and current
 * product on-hand stock, writes append-only EvidenceItem rows, and has no PO,
 * supplier, payment, inventory-movement, pricing, or provider dependency.
 */
@Service
public class SavdoGraphB2Service {

    static final String GROSS_PROFIT_ANALYSIS = "GROSS_PROFIT_BRIEF";
    static final String REORDER_SIMULATION_ANALYSIS = "REORDER_SIMULATION";
    static final String GROSS_PROFIT_CALCULATION_ID = "DAILY_GROSS_PROFIT_BRIEF";
    static final String REORDER_CALCULATION_ID = "SCENARIO_NET_SALES_REORDER";
    static final String CALCULATION_VERSION = "B2.0";
    static final String TOOL_VERSION = "savdograph-b2";
    static final String TIMEZONE = "Asia/Tashkent";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of(TIMEZONE);
    private static final long MAX_BRIEF_DAYS = 31;
    private static final long MAX_REORDER_LOOKBACK_DAYS = 90;
    static final int MAX_REORDER_QUANTITY = 100_000;

    private final SaleRepository sales;
    private final ProductRepository products;
    private final AnalysisRunRepository analysisRuns;
    private final EvidenceItemRepository evidenceItems;
    private final ObjectMapper objectMapper;

    public SavdoGraphB2Service(SaleRepository sales, ProductRepository products,
                               AnalysisRunRepository analysisRuns, EvidenceItemRepository evidenceItems,
                               ObjectMapper objectMapper) {
        this.sales = sales;
        this.products = products;
        this.analysisRuns = analysisRuns;
        this.evidenceItems = evidenceItems;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public GrossProfitBriefResponse generateGrossProfitBrief(GrossProfitBriefRequest request) {
        validatePeriod(request.periodStart(), request.periodEnd(), MAX_BRIEF_DAYS, "Gross Profit Brief");
        long shopId = requireSingleShop();
        List<Sale> windowSales = sales.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAscIdAsc(
                boundary(request.periodStart()), boundary(request.periodEnd()));
        BriefAggregate aggregate = aggregateBrief(windowSales);
        SavdoGraphResultClassification classification = aggregate.classification();
        List<String> assumptions = List.of(
                "Sale date is start-inclusive and end-exclusive in " + TIMEZONE + ".",
                "Revenue is the as-of snapshot totalUzs minus refundedTotalUzs.",
                "Credit sales are included because persisted Sale is the booked checkout record.");
        List<String> limitations = aggregate.limitations();

        AnalysisRun run = createRun(shopId, GROSS_PROFIT_ANALYSIS, request.periodStart(), request.periodEnd(),
                mapOf("timezone", TIMEZONE, "calculationId", GROSS_PROFIT_CALCULATION_ID,
                        "calculationVersion", CALCULATION_VERSION));
        Map<String, Long> evidenceIds = new LinkedHashMap<>();
        evidenceIds.put("periodTimezone", saveEvidence(run, null, EvidenceType.PERIOD_TIMEZONE,
                "BUSINESS_PERIOD", GROSS_PROFIT_CALCULATION_ID, null, null, null,
                mapOf("timezone", TIMEZONE, "startInclusive", request.periodStart(),
                        "endExclusive", request.periodEnd(), "zoneId", BUSINESS_ZONE.getId())).getId());
        evidenceIds.put("revenue", saveEvidence(run, null, EvidenceType.REVENUE, "SALE_TOTALS",
                GROSS_PROFIT_CALCULATION_ID, aggregate.revenueUzs(), "money", Currency.UZS,
                mapOf("formula", "SUM(totalUzs) - SUM(refundedTotalUzs)",
                        "saleCount", aggregate.saleCount(), "currencyProvenanceValid", aggregate.currencyValid())).getId());
        evidenceIds.put("refundedRevenue", saveEvidence(run, null, EvidenceType.REFUNDED_REVENUE,
                "SALE_REFUNDS", GROSS_PROFIT_CALCULATION_ID, aggregate.refundedUzs(), "money", Currency.UZS,
                mapOf("formula", "SUM(refundedTotalUzs) for sales in the sale-date period",
                        "saleCount", aggregate.saleCount())).getId());
        evidenceIds.put("cogs", saveEvidence(run, null, EvidenceType.COGS, "SALE_ITEM_COST_SNAPSHOT",
                GROSS_PROFIT_CALCULATION_ID, aggregate.cogsUzs(), "money", Currency.UZS,
                mapOf("formula", "SUM((quantity - refundedQty) * costAtSaleUzs)",
                        "saleItemCount", aggregate.saleItemCount(), "costSnapshotComplete", aggregate.costComplete(),
                        "costSnapshotProvenance", aggregate.costProvenance().name())).getId());
        evidenceIds.put("grossProfit", saveEvidence(run, null, EvidenceType.GROSS_PROFIT,
                "DETERMINISTIC_AGGREGATE", GROSS_PROFIT_CALCULATION_ID, aggregate.grossProfitUzs(), "money",
                Currency.UZS, mapOf("formula", "revenueUzs - grossCogsUzs")).getId());
        evidenceIds.put("grossMargin", saveEvidence(run, null, EvidenceType.GROSS_MARGIN,
                "DETERMINISTIC_AGGREGATE", GROSS_PROFIT_CALCULATION_ID, aggregate.grossMarginPercent(), "percent",
                null, mapOf("formula", "grossProfitUzs / revenueUzs * 100 when revenueUzs > 0",
                        "state", aggregate.marginState())).getId());
        evidenceIds.put("sourceRecordCounts", saveEvidence(run, null, EvidenceType.SOURCE_RECORD_COUNT,
                "SALES_AND_SALE_ITEMS", GROSS_PROFIT_CALCULATION_ID, BigDecimal.valueOf(aggregate.saleCount()),
                "sales", null, mapOf("completedSaleCount", aggregate.saleCount(),
                        "sourceSaleItemCount", aggregate.saleItemCount())).getId());

        GrossProfitBriefResponse withoutClassificationEvidence = new GrossProfitBriefResponse(
                run.getId(), "Daily Gross Profit Brief", classification, request.periodStart(), request.periodEnd(),
                TIMEZONE, Currency.UZS, aggregate.revenueUzs(), aggregate.cogsUzs(), aggregate.grossProfitUzs(),
                aggregate.grossMarginPercent(), aggregate.marginState(), aggregate.saleCount(), aggregate.saleItemCount(),
                aggregate.refundedUzs(), assumptions, limitations, GROSS_PROFIT_CALCULATION_ID, CALCULATION_VERSION,
                LocalDateTime.now(BUSINESS_ZONE), Map.copyOf(evidenceIds));
        EvidenceItem classificationEvidence = saveEvidence(run, null, EvidenceType.RESULT_CLASSIFICATION,
                "B2_CLASSIFICATION", GROSS_PROFIT_CALCULATION_ID, null, null, null,
                mapOf("classification", classification.name(), "assumptions", assumptions, "limitations", limitations,
                        "snapshot", withoutClassificationEvidence));
        evidenceIds.put("classification", classificationEvidence.getId());
        return withEvidenceIds(withoutClassificationEvidence, evidenceIds);
    }

    @Transactional(readOnly = true)
    public GrossProfitBriefResponse getGrossProfitBrief(Long analysisRunId) {
        AnalysisRun run = findRun(analysisRunId, GROSS_PROFIT_ANALYSIS);
        Map<EvidenceType, EvidenceItem> evidence = evidenceByType(run);
        GrossProfitBriefResponse snapshot = readSnapshot(evidence.get(EvidenceType.RESULT_CLASSIFICATION),
                GrossProfitBriefResponse.class);
        return withEvidenceIds(snapshot, namedEvidenceIds(evidence));
    }

    @Transactional
    public ReorderSimulationResponse runReorderSimulation(ReorderSimulationRequest request) {
        validatePeriod(request.lookbackStart(), request.lookbackEnd(), MAX_REORDER_LOOKBACK_DAYS, "Reorder simulator");
        validateScenario(request);
        long shopId = requireSingleShop();
        Product product = products.findById(request.productId())
                .orElseThrow(() -> NotFoundException.of("Mahsulot", request.productId()));
        List<Sale> windowSales = sales.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAscIdAsc(
                boundary(request.lookbackStart()), boundary(request.lookbackEnd()));
        ReorderAggregate aggregate = aggregateReorder(product, windowSales, request);
        List<String> assumptions = List.of(
                "Lead time is an owner-visible scenario assumption: " + request.leadTimeDays() + " days.",
                "Safety stock is an owner-visible scenario assumption: " + request.safetyStockDays() + " days.",
                "Forecast horizon is an owner-visible scenario assumption: " + request.forecastHorizonDays() + " days.",
                "Formula: max(0, ceil(netUnitsSold/lookbackDays * (leadTimeDays + safetyStockDays + forecastHorizonDays) - currentOnHand)).");
        List<String> risks = aggregate.risks();
        List<String> limitations = List.of(
                "No reserved stock, incoming purchase order, supplier delivery, or cross-unit conversion is claimed.",
                "Tied-up capital is unavailable because current on-hand inventory has no immutable lot-cost provenance.");

        AnalysisRun run = createRun(shopId, REORDER_SIMULATION_ANALYSIS, request.lookbackStart(), request.lookbackEnd(),
                mapOf("productId", product.getId(), "lookbackStart", request.lookbackStart(),
                        "lookbackEnd", request.lookbackEnd(), "leadTimeDays", request.leadTimeDays(),
                        "safetyStockDays", request.safetyStockDays(), "forecastHorizonDays", request.forecastHorizonDays(),
                        "calculationId", REORDER_CALCULATION_ID, "calculationVersion", CALCULATION_VERSION));
        Map<String, Long> evidenceIds = new LinkedHashMap<>();
        evidenceIds.put("periodTimezone", saveEvidence(run, product.getId(), EvidenceType.PERIOD_TIMEZONE,
                "BUSINESS_PERIOD", REORDER_CALCULATION_ID, null, null, null,
                mapOf("timezone", TIMEZONE, "startInclusive", request.lookbackStart(),
                        "endExclusive", request.lookbackEnd())).getId());
        evidenceIds.put("currentStock", saveEvidence(run, product.getId(), EvidenceType.REORDER_CURRENT_STOCK,
                "PRODUCT_ON_HAND", REORDER_CALCULATION_ID, BigDecimal.valueOf(product.getQuantity()), product.getUnit(),
                product.getCurrency(), mapOf("currentOnHandQuantity", product.getQuantity(),
                        "productUnit", product.getUnit())).getId());
        evidenceIds.put("netUnitsSold", saveEvidence(run, product.getId(), EvidenceType.REORDER_NET_UNITS_SOLD,
                "SALE_ITEM_RETURNS_NETTED", REORDER_CALCULATION_ID, aggregate.netUnitsSold(), product.getUnit(), null,
                mapOf("formula", "SUM(quantity - refundedQty) for this product", "sourceSaleItemCount",
                        aggregate.sourceSaleItemCount())).getId());
        evidenceIds.put("velocity", saveEvidence(run, product.getId(), EvidenceType.REORDER_VELOCITY,
                "SALE_ITEM_RETURNS_NETTED", REORDER_CALCULATION_ID, aggregate.velocityUnitsPerDay(), "units/day", null,
                mapOf("formula", "netUnitsSold / explicitLookbackDays", "lookbackDays", aggregate.lookbackDays())).getId());
        evidenceIds.put("reorderQuantity", saveEvidence(run, product.getId(), EvidenceType.REORDER_QUANTITY,
                "SCENARIO_FORMULA", REORDER_CALCULATION_ID, decimal(aggregate.reorderQuantity()), product.getUnit(), null,
                mapOf("leadTimeDays", request.leadTimeDays(), "safetyStockDays", request.safetyStockDays(),
                        "forecastHorizonDays", request.forecastHorizonDays(), "formulaVersion", CALCULATION_VERSION)).getId());
        evidenceIds.put("coverageBefore", saveEvidence(run, product.getId(), EvidenceType.REORDER_COVERAGE_BEFORE,
                "SCENARIO_FORMULA", REORDER_CALCULATION_ID, aggregate.coverageBeforeDays(), "days", null,
                mapOf("state", aggregate.velocityUnitsPerDay() == null || aggregate.velocityUnitsPerDay().signum() == 0
                        ? "UNAVAILABLE_ZERO_VELOCITY" : "AVAILABLE")).getId());
        evidenceIds.put("coverageAfter", saveEvidence(run, product.getId(), EvidenceType.REORDER_COVERAGE_AFTER,
                "SCENARIO_FORMULA", REORDER_CALCULATION_ID, aggregate.coverageAfterDays(), "days", null,
                mapOf("state", aggregate.velocityUnitsPerDay() == null || aggregate.velocityUnitsPerDay().signum() == 0
                        ? "UNAVAILABLE_ZERO_VELOCITY" : "AVAILABLE")).getId());
        evidenceIds.put("stockoutRisk", saveEvidence(run, product.getId(), EvidenceType.REORDER_STOCKOUT_RISK,
                "SCENARIO_RISK", REORDER_CALCULATION_ID, aggregate.coverageBeforeDays(), "days", null,
                mapOf("risk", aggregate.stockoutRisk())).getId());
        evidenceIds.put("overstockRisk", saveEvidence(run, product.getId(), EvidenceType.REORDER_OVERSTOCK_RISK,
                "SCENARIO_RISK", REORDER_CALCULATION_ID, aggregate.coverageAfterDays(), "days", null,
                mapOf("risk", aggregate.overstockRisk())).getId());
        evidenceIds.put("tiedUpCapital", saveEvidence(run, product.getId(), EvidenceType.REORDER_TIED_UP_CAPITAL,
                "UNAVAILABLE_LOT_COST", REORDER_CALCULATION_ID, null, "money", Currency.UZS,
                mapOf("state", "UNAVAILABLE_NO_LOT_COST_PROVENANCE")).getId());

        ReorderSimulationResponse withoutClassificationEvidence = new ReorderSimulationResponse(
                run.getId(), aggregate.classification(), product.getId(), product.getBarcode(), product.getUnit(),
                product.getQuantity(), request.lookbackStart(), request.lookbackEnd(), aggregate.netUnitsSold(),
                aggregate.velocityUnitsPerDay(), request.leadTimeDays(), request.safetyStockDays(),
                request.forecastHorizonDays(), aggregate.reorderQuantity(), aggregate.coverageBeforeDays(),
                aggregate.coverageAfterDays(), aggregate.stockoutRisk(), aggregate.overstockRisk(), null,
                "UNAVAILABLE_NO_LOT_COST_PROVENANCE", assumptions, risks, limitations, REORDER_CALCULATION_ID,
                CALCULATION_VERSION, LocalDateTime.now(BUSINESS_ZONE), Map.copyOf(evidenceIds));
        EvidenceItem classificationEvidence = saveEvidence(run, product.getId(), EvidenceType.RESULT_CLASSIFICATION,
                "B2_CLASSIFICATION", REORDER_CALCULATION_ID, null, null, null,
                mapOf("classification", aggregate.classification().name(), "assumptions", assumptions, "risks", risks,
                        "limitations", limitations, "snapshot", withoutClassificationEvidence));
        evidenceIds.put("classification", classificationEvidence.getId());
        return withEvidenceIds(withoutClassificationEvidence, evidenceIds);
    }

    @Transactional(readOnly = true)
    public ReorderSimulationResponse getReorderSimulation(Long analysisRunId) {
        AnalysisRun run = findRun(analysisRunId, REORDER_SIMULATION_ANALYSIS);
        Map<EvidenceType, EvidenceItem> evidence = evidenceByType(run);
        ReorderSimulationResponse snapshot = readSnapshot(evidence.get(EvidenceType.RESULT_CLASSIFICATION),
                ReorderSimulationResponse.class);
        return withEvidenceIds(snapshot, namedEvidenceIds(evidence));
    }

    private BriefAggregate aggregateBrief(List<Sale> windowSales) {
        BigDecimal grossTotal = BigDecimal.ZERO;
        BigDecimal refunded = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;
        boolean currencyValid = true;
        boolean costComplete = true;
        boolean invalidQuantity = false;
        boolean legacyCost = false;
        long itemCount = 0;
        List<String> limitations = new ArrayList<>();
        for (Sale sale : windowSales) {
            if (sale.getCurrency() != Currency.UZS || sale.getTotalUzs() == null || sale.getRefundedTotalUzs() == null
                    || sale.getRefundedTotalUzs().compareTo(sale.getTotalUzs()) > 0) {
                currencyValid = false;
            }
            grossTotal = grossTotal.add(zero(sale.getTotalUzs()));
            refunded = refunded.add(zero(sale.getRefundedTotalUzs()));
            for (SaleItem item : sale.getItems()) {
                itemCount++;
                if (item.getCurrency() == null || (item.getCurrency() == Currency.USD
                        && item.getUsdRateAtSale() == null)) {
                    currencyValid = false;
                }
                if (item.getRefundedQty() < 0 || item.getRefundedQty() > item.getQuantity()) {
                    invalidQuantity = true;
                    continue;
                }
                if (item.getCostAtSaleUzs() == null) {
                    costComplete = false;
                    continue;
                }
                if (item.getCostSnapshotProvenance() != CostSnapshotProvenance.TRANSACTION_TIME) {
                    legacyCost = true;
                }
                cogs = cogs.add(item.getCostAtSaleUzs().multiply(BigDecimal.valueOf(item.getQuantity() - item.getRefundedQty())));
            }
        }
        if (!currencyValid) {
            limitations.add("Currency provenance is missing, mixed, or not UZS-canonical; no aggregate is presented.");
        }
        if (!costComplete) {
            limitations.add("At least one sale item has no transaction-time costAtSaleUzs; current product cost is never used.");
        }
        if (invalidQuantity) {
            limitations.add("A refunded quantity is outside its sold quantity; COGS cannot be trusted.");
        }
        if (legacyCost) {
            limitations.add("At least one cost snapshot is LEGACY_OR_UNKNOWN and is therefore estimated, not verified.");
        }
        SavdoGraphResultClassification classification;
        if (!currencyValid || !costComplete || invalidQuantity) {
            classification = SavdoGraphResultClassification.INSUFFICIENT_DATA;
        } else if (legacyCost) {
            classification = SavdoGraphResultClassification.ESTIMATED;
        } else {
            classification = SavdoGraphResultClassification.VERIFIED;
        }
        if (classification == SavdoGraphResultClassification.INSUFFICIENT_DATA) {
            return new BriefAggregate(classification, null, null, null, null, "UNAVAILABLE_INSUFFICIENT_DATA",
                    windowSales.size(), itemCount, null, currencyValid, costComplete,
                    legacyCost ? CostSnapshotProvenance.LEGACY_OR_UNKNOWN : CostSnapshotProvenance.TRANSACTION_TIME,
                    List.copyOf(limitations));
        }
        BigDecimal revenue = display(grossTotal.subtract(refunded));
        BigDecimal displayedCogs = display(cogs);
        BigDecimal grossProfit = display(revenue.subtract(displayedCogs));
        BigDecimal margin = revenue.signum() > 0
                ? display(grossProfit.multiply(BigDecimal.valueOf(100)).divide(revenue, 8, RoundingMode.HALF_UP))
                : null;
        String marginState = margin == null ? "UNAVAILABLE_ZERO_REVENUE" : "AVAILABLE";
        return new BriefAggregate(classification, revenue, displayedCogs, grossProfit, margin, marginState,
                windowSales.size(), itemCount, display(refunded), true, true,
                legacyCost ? CostSnapshotProvenance.LEGACY_OR_UNKNOWN : CostSnapshotProvenance.TRANSACTION_TIME,
                List.copyOf(limitations));
    }

    private ReorderAggregate aggregateReorder(Product product, List<Sale> windowSales,
                                              ReorderSimulationRequest request) {
        boolean valid = product.getQuantity() >= 0 && product.getUnit() != null && !product.getUnit().isBlank()
                && product.getCurrency() != null;
        BigDecimal netUnits = BigDecimal.ZERO;
        long sourceItems = 0;
        List<String> risks = new ArrayList<>();
        for (Sale sale : windowSales) {
            for (SaleItem item : sale.getItems()) {
                if (!Objects.equals(product.getId(), item.getProductId())) {
                    continue;
                }
                sourceItems++;
                if (item.getRefundedQty() < 0 || item.getRefundedQty() > item.getQuantity()) {
                    valid = false;
                    continue;
                }
                netUnits = netUnits.add(BigDecimal.valueOf(item.getQuantity() - item.getRefundedQty()));
            }
        }
        long days = ChronoUnit.DAYS.between(request.lookbackStart(), request.lookbackEnd());
        if (!valid) {
            risks.add(product.getQuantity() < 0
                    ? "INSUFFICIENT_DATA_NEGATIVE_ON_HAND"
                    : "INSUFFICIENT_DATA_PRODUCT_UNIT_OR_CURRENCY_OR_RETURN_QUANTITY");
            return new ReorderAggregate(SavdoGraphResultClassification.INSUFFICIENT_DATA, display(netUnits), null,
                    null, null, null, "INSUFFICIENT_DATA", "INSUFFICIENT_DATA", sourceItems, days,
                    List.copyOf(risks));
        }
        BigDecimal velocity = netUnits.divide(BigDecimal.valueOf(days), 8, RoundingMode.HALF_UP);
        if (velocity.signum() == 0) {
            risks.add("NO_OBSERVED_SALES_IN_LOOKBACK");
            return new ReorderAggregate(SavdoGraphResultClassification.ESTIMATED, display(netUnits), display(velocity),
                    0, null, null, "NO_OBSERVED_SALES", "NO_SCENARIO_OVERSTOCK", sourceItems, days,
                    List.copyOf(risks));
        }
        int targetDays = request.leadTimeDays() + request.safetyStockDays() + request.forecastHorizonDays();
        BigDecimal targetStock = velocity.multiply(BigDecimal.valueOf(targetDays));
        BigDecimal rawQuantity = targetStock.subtract(BigDecimal.valueOf(product.getQuantity()));
        BigDecimal roundedQuantity = rawQuantity.setScale(0, RoundingMode.CEILING);
        if (roundedQuantity.compareTo(BigDecimal.valueOf(MAX_REORDER_QUANTITY)) > 0) {
            risks.add("INSUFFICIENT_DATA_SCENARIO_QUANTITY_EXCEEDS_SAFE_LIMIT");
            return new ReorderAggregate(SavdoGraphResultClassification.INSUFFICIENT_DATA, display(netUnits), display(velocity),
                    null, null, null, "INSUFFICIENT_DATA", "INSUFFICIENT_DATA", sourceItems, days,
                    List.copyOf(risks));
        }
        int reorderQuantity = Math.max(0, roundedQuantity.intValueExact());
        BigDecimal before = display(BigDecimal.valueOf(product.getQuantity()).divide(velocity, 8, RoundingMode.HALF_UP));
        BigDecimal after = display(BigDecimal.valueOf(product.getQuantity() + reorderQuantity)
                .divide(velocity, 8, RoundingMode.HALF_UP));
        String stockoutRisk = before.compareTo(BigDecimal.valueOf(request.leadTimeDays())) < 0
                ? "ESTIMATED_STOCKOUT_BEFORE_LEAD_TIME" : "NO_STOCKOUT_WITHIN_ASSUMED_LEAD_TIME";
        String overstockRisk = reorderQuantity == 0 && before.compareTo(BigDecimal.valueOf(targetDays)) > 0
                ? "ESTIMATED_ABOVE_SCENARIO_TARGET" : "NO_SCENARIO_OVERSTOCK";
        risks.add(stockoutRisk);
        risks.add(overstockRisk);
        return new ReorderAggregate(SavdoGraphResultClassification.ESTIMATED, display(netUnits), display(velocity),
                reorderQuantity, before, after, stockoutRisk, overstockRisk, sourceItems, days, List.copyOf(risks));
    }

    private AnalysisRun createRun(long shopId, String analysisType, LocalDate periodStart, LocalDate periodEnd,
                                  Map<String, Object> input) {
        String snapshot = json(input);
        AnalysisRun run = new AnalysisRun();
        run.setShopId(shopId);
        run.setAnalysisType(analysisType);
        run.setPeriodFrom(periodStart);
        run.setPeriodTo(periodEnd);
        run.setStatus(AnalysisRunStatus.RECORDED);
        run.setInitiatedBy(currentActor());
        run.setToolVersion(TOOL_VERSION);
        run.setInputSnapshot(snapshot);
        run.setInputHash(sha256(snapshot));
        return analysisRuns.save(run);
    }

    private EvidenceItem saveEvidence(AnalysisRun run, Long productId, EvidenceType evidenceType, String sourceType,
                                      String calculationId, BigDecimal result, String unit, Currency currency,
                                      Map<String, Object> input) {
        EvidenceItem evidence = new EvidenceItem();
        evidence.setShopId(run.getShopId());
        evidence.setAnalysisRunId(run.getId());
        evidence.setProductId(productId);
        evidence.setEvidenceType(evidenceType);
        evidence.setSourceType(sourceType);
        evidence.setPeriodFrom(run.getPeriodFrom());
        evidence.setPeriodTo(run.getPeriodTo());
        evidence.setCalculationId(calculationId);
        evidence.setCalculationVersion(CALCULATION_VERSION);
        evidence.setInputData(json(input));
        evidence.setCalculatedResult(result);
        evidence.setUnit(unit);
        evidence.setCurrency(currency);
        evidence.setHashVersion(EvidenceContentHasher.HASH_VERSION);
        evidence.setContentHash(EvidenceContentHasher.hash(evidence));
        return evidenceItems.save(evidence);
    }

    private AnalysisRun findRun(Long id, String expectedType) {
        requireSingleShop();
        AnalysisRun run = analysisRuns.findById(id).orElseThrow(() -> NotFoundException.of("Tahlil", id));
        if (!expectedType.equals(run.getAnalysisType())) {
            throw new BadRequestException("So'ralgan B2 tahlil turi mos emas");
        }
        return run;
    }

    private Map<EvidenceType, EvidenceItem> evidenceByType(AnalysisRun run) {
        Map<EvidenceType, EvidenceItem> result = new EnumMap<>(EvidenceType.class);
        evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(run.getId()).forEach(item -> result.put(item.getEvidenceType(), item));
        if (!result.containsKey(EvidenceType.RESULT_CLASSIFICATION)) {
            throw new IllegalStateException("B2 tahlil natijasida classification evidence topilmadi");
        }
        return result;
    }

    private Map<String, Long> namedEvidenceIds(Map<EvidenceType, EvidenceItem> evidence) {
        Map<String, Long> ids = new LinkedHashMap<>();
        evidence.forEach((type, item) -> ids.put(evidenceKey(type), item.getId()));
        return Map.copyOf(ids);
    }

    private static String evidenceKey(EvidenceType type) {
        return switch (type) {
            case PERIOD_TIMEZONE -> "periodTimezone";
            case REVENUE -> "revenue";
            case REFUNDED_REVENUE -> "refundedRevenue";
            case COGS -> "cogs";
            case GROSS_PROFIT -> "grossProfit";
            case GROSS_MARGIN -> "grossMargin";
            case SOURCE_RECORD_COUNT -> "sourceRecordCounts";
            case RESULT_CLASSIFICATION -> "classification";
            case REORDER_CURRENT_STOCK -> "currentStock";
            case REORDER_NET_UNITS_SOLD -> "netUnitsSold";
            case REORDER_VELOCITY -> "velocity";
            case REORDER_QUANTITY -> "reorderQuantity";
            case REORDER_COVERAGE_BEFORE -> "coverageBefore";
            case REORDER_COVERAGE_AFTER -> "coverageAfter";
            case REORDER_STOCKOUT_RISK -> "stockoutRisk";
            case REORDER_OVERSTOCK_RISK -> "overstockRisk";
            case REORDER_TIED_UP_CAPITAL -> "tiedUpCapital";
        };
    }

    private <T> T readSnapshot(EvidenceItem classificationEvidence, Class<T> type) {
        try {
            JsonNode root = objectMapper.readTree(classificationEvidence.getInputData());
            return objectMapper.treeToValue(root.path("snapshot"), type);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("B2 immutable snapshot o'qilmadi", ex);
        }
    }

    private static GrossProfitBriefResponse withEvidenceIds(GrossProfitBriefResponse response,
                                                             Map<String, Long> evidenceIds) {
        return new GrossProfitBriefResponse(response.analysisRunId(), response.label(), response.classification(),
                response.periodStart(), response.periodEnd(), response.timezone(), response.currency(), response.revenueUzs(),
                response.cogsUzs(), response.grossProfitUzs(), response.grossMarginPercent(), response.grossMarginState(),
                response.completedSaleCount(), response.sourceSaleItemCount(), response.refundedAmountUzs(),
                response.assumptions(), response.limitations(), response.calculationId(), response.calculationVersion(),
                response.generatedAt(), Map.copyOf(evidenceIds));
    }

    private static ReorderSimulationResponse withEvidenceIds(ReorderSimulationResponse response,
                                                              Map<String, Long> evidenceIds) {
        return new ReorderSimulationResponse(response.analysisRunId(), response.classification(), response.productId(),
                response.productSku(), response.unit(), response.currentOnHandQuantity(), response.lookbackStart(),
                response.lookbackEnd(), response.netUnitsSold(), response.velocityUnitsPerDay(), response.leadTimeDays(),
                response.safetyStockDays(), response.forecastHorizonDays(), response.reorderQuantity(),
                response.coverageBeforeDays(), response.coverageAfterDays(), response.stockoutRisk(), response.overstockRisk(),
                response.tiedUpCapitalUzs(), response.tiedUpCapitalState(), response.assumptions(), response.risks(),
                response.limitations(), response.calculationId(), response.calculationVersion(), response.generatedAt(),
                Map.copyOf(evidenceIds));
    }

    private static void validatePeriod(LocalDate start, LocalDate end, long maximumDays, String label) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new BadRequestException(label + " davri start-inclusive va end-exclusive bo'lishi kerak");
        }
        if (ChronoUnit.DAYS.between(start, end) > maximumDays) {
            throw new BadRequestException(label + " davri " + maximumDays + " kundan oshmasligi kerak");
        }
    }

    private static void validateScenario(ReorderSimulationRequest request) {
        if (request.leadTimeDays() == null || request.safetyStockDays() == null || request.forecastHorizonDays() == null
                || request.leadTimeDays() < 0 || request.leadTimeDays() > 60
                || request.safetyStockDays() < 0 || request.safetyStockDays() > 90
                || request.forecastHorizonDays() < 1 || request.forecastHorizonDays() > 180) {
            throw new BadRequestException("Reorder scenario assumptions are outside the documented bounded limits");
        }
    }

    private static LocalDateTime boundary(LocalDate date) {
        return date.atStartOfDay(BUSINESS_ZONE).toLocalDateTime();
    }

    private static long requireSingleShop() {
        Long shopId = TenantContext.currentShopId();
        if (shopId == null) {
            throw new BadRequestException("SavdoGraph B2 uchun bitta faol do'kon tanlanishi kerak");
        }
        return shopId;
    }

    private static String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null || auth.getName().isBlank()) {
            throw new BadRequestException("Autentifikatsiyalangan foydalanuvchi talab qilinadi");
        }
        return auth.getName();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("SavdoGraph B2 dalili saqlanmadi", ex);
        }
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 mavjud emas", ex);
        }
    }

    private static BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal display(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal decimal(Integer value) {
        return value == null ? null : BigDecimal.valueOf(value);
    }


    private static Map<String, Object> mapOf(Object... entries) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int index = 0; index < entries.length; index += 2) {
            map.put((String) entries[index], entries[index + 1]);
        }
        return map;
    }

    private record BriefAggregate(
            SavdoGraphResultClassification classification,
            BigDecimal revenueUzs,
            BigDecimal cogsUzs,
            BigDecimal grossProfitUzs,
            BigDecimal grossMarginPercent,
            String marginState,
            long saleCount,
            long saleItemCount,
            BigDecimal refundedUzs,
            boolean currencyValid,
            boolean costComplete,
            CostSnapshotProvenance costProvenance,
            List<String> limitations) {
    }

    private record ReorderAggregate(
            SavdoGraphResultClassification classification,
            BigDecimal netUnitsSold,
            BigDecimal velocityUnitsPerDay,
            Integer reorderQuantity,
            BigDecimal coverageBeforeDays,
            BigDecimal coverageAfterDays,
            String stockoutRisk,
            String overstockRisk,
            long sourceSaleItemCount,
            long lookbackDays,
            List<String> risks) {
    }
}
