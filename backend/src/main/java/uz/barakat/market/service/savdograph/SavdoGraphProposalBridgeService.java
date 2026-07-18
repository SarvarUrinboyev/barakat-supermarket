package uz.barakat.market.service.savdograph;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.ActionLedgerEvent;
import uz.barakat.market.domain.AnalysisRun;
import uz.barakat.market.domain.AnalysisRunStatus;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.DecisionProposal;
import uz.barakat.market.domain.DecisionProposalStatus;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.SavdoGraphResultClassification;
import uz.barakat.market.domain.Supplier;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalRequest;
import uz.barakat.market.dto.SavdoGraphProposalBridgeDtos.CreateReviewProposalResponse;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.ConflictException;
import uz.barakat.market.exception.ForbiddenException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.ActionLedgerEventRepository;
import uz.barakat.market.repository.AnalysisRunRepository;
import uz.barakat.market.repository.DecisionProposalRepository;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.SupplierRepository;

/**
 * Server-controlled B3.5 bridge. It never accepts client calculation fields and
 * never creates a purchase order or performs a decision.
 */
@Service
public class SavdoGraphProposalBridgeService {

    public static final String SOURCE_KIND = "B2_REORDER_SIMULATION";
    static final String PROPOSAL_TYPE = "REORDER";
    public static final String LEDGER_EVENT = "PROPOSAL_CREATED_FROM_REORDER_SIMULATION";

    private static final Set<EvidenceType> REQUIRED_EVIDENCE = EnumSet.of(
            EvidenceType.PERIOD_TIMEZONE,
            EvidenceType.REORDER_CURRENT_STOCK,
            EvidenceType.REORDER_NET_UNITS_SOLD,
            EvidenceType.REORDER_VELOCITY,
            EvidenceType.REORDER_QUANTITY,
            EvidenceType.REORDER_COVERAGE_BEFORE,
            EvidenceType.REORDER_COVERAGE_AFTER,
            EvidenceType.REORDER_STOCKOUT_RISK,
            EvidenceType.REORDER_OVERSTOCK_RISK,
            EvidenceType.REORDER_TIED_UP_CAPITAL,
            EvidenceType.RESULT_CLASSIFICATION);

    private static final Map<EvidenceType, String> REQUIRED_SOURCE_TYPES = Map.ofEntries(
            Map.entry(EvidenceType.PERIOD_TIMEZONE, "BUSINESS_PERIOD"),
            Map.entry(EvidenceType.REORDER_CURRENT_STOCK, "PRODUCT_ON_HAND"),
            Map.entry(EvidenceType.REORDER_NET_UNITS_SOLD, "SALE_ITEM_RETURNS_NETTED"),
            Map.entry(EvidenceType.REORDER_VELOCITY, "SALE_ITEM_RETURNS_NETTED"),
            Map.entry(EvidenceType.REORDER_QUANTITY, "SCENARIO_FORMULA"),
            Map.entry(EvidenceType.REORDER_COVERAGE_BEFORE, "SCENARIO_FORMULA"),
            Map.entry(EvidenceType.REORDER_COVERAGE_AFTER, "SCENARIO_FORMULA"),
            Map.entry(EvidenceType.REORDER_STOCKOUT_RISK, "SCENARIO_RISK"),
            Map.entry(EvidenceType.REORDER_OVERSTOCK_RISK, "SCENARIO_RISK"),
            Map.entry(EvidenceType.REORDER_TIED_UP_CAPITAL, "UNAVAILABLE_LOT_COST"),
            Map.entry(EvidenceType.RESULT_CLASSIFICATION, "B2_CLASSIFICATION"));

    private final AnalysisRunRepository analysisRuns;
    private final EvidenceItemRepository evidenceItems;
    private final DecisionProposalRepository proposals;
    private final ProductRepository products;
    private final SupplierRepository suppliers;
    private final ActionLedgerEventRepository ledger;
    private final ObjectMapper mapper;

    public SavdoGraphProposalBridgeService(
            AnalysisRunRepository analysisRuns,
            EvidenceItemRepository evidenceItems,
            DecisionProposalRepository proposals,
            ProductRepository products,
            SupplierRepository suppliers,
            ActionLedgerEventRepository ledger,
            ObjectMapper mapper) {
        this.analysisRuns = analysisRuns;
        this.evidenceItems = evidenceItems;
        this.proposals = proposals;
        this.products = products;
        this.suppliers = suppliers;
        this.ledger = ledger;
        this.mapper = mapper;
    }

    @Transactional
    public CreateReviewProposalResponse create(Long analysisRunId, CreateReviewProposalRequest request) {
        long shopId = requireSingleShop();
        AnalysisRun run = analysisRuns.findByIdForUpdate(analysisRunId)
                .orElseThrow(() -> NotFoundException.of("Reorder simulation", analysisRunId));
        JsonNode runInput = validateRun(run, shopId);
        List<EvidenceItem> evidence = evidenceItems.findAllByAnalysisRunIdOrderByIdAsc(run.getId());
        ValidatedSimulation simulation = validateEvidence(run, runInput, evidence, shopId);

        Product product = products.findById(simulation.productId())
                .orElseThrow(() -> NotFoundException.of("Mahsulot", simulation.productId()));
        validateProductSemantics(product, simulation);
        Supplier supplier = suppliers.findById(request.supplierId())
                .orElseThrow(() -> NotFoundException.of("Yetkazib beruvchi", request.supplierId()));

        DecisionProposal existing = proposals
                .findByAnalysisRunIdAndSourceKind(run.getId(), SOURCE_KIND)
                .orElse(null);
        if (existing != null) {
            if (!Objects.equals(existing.getSupplierId(), supplier.getId())
                    || existing.getStatus() != DecisionProposalStatus.PROPOSED
                    || !Objects.equals(existing.getProductId(), product.getId())
                    || existing.getProposedReorderQuantity() != simulation.reorderQuantity()
                    || !evidenceIds(existing).equals(simulation.evidenceIds())
                    || !evidenceHash(evidence).equals(existing.getEvidenceHash())) {
                throw new ConflictException(
                        "This reorder simulation already has a conflicting or finalized review proposal");
            }
            return response(existing, product, supplier, simulation, true);
        }

        DecisionProposal proposal = new DecisionProposal();
        proposal.setShopId(shopId);
        proposal.setAnalysisRunId(run.getId());
        proposal.setProductId(product.getId());
        proposal.setSupplierId(supplier.getId());
        proposal.setProposalType(PROPOSAL_TYPE);
        proposal.setSourceKind(SOURCE_KIND);
        proposal.setProposedReorderQuantity(simulation.reorderQuantity());
        proposal.setExpectedImpact(json(Map.of(
                "source", SOURCE_KIND,
                "classification", simulation.classification().name(),
                "limitations", simulation.limitations())));
        proposal.setRiskSummary(json(simulation.risks()));
        proposal.setAssumptions(json(simulation.assumptions()));
        proposal.setStatus(DecisionProposalStatus.PROPOSED);
        proposal.setEvidenceItems(new ArrayList<>(evidence));
        proposal.setEvidenceHash(evidenceHash(evidence));
        proposal.setCreatedBy(currentActor());

        DecisionProposal saved = proposals.saveAndFlush(proposal);
        appendLedger(saved, simulation.evidenceIds(), supplier.getId());
        return response(saved, product, supplier, simulation, false);
    }

    private JsonNode validateRun(AnalysisRun run, long shopId) {
        if (!Objects.equals(run.getShopId(), shopId)) {
            throw NotFoundException.of("Reorder simulation", run.getId());
        }
        if (run.getStatus() != AnalysisRunStatus.RECORDED) {
            throw new BadRequestException("Reorder simulation is not in the completed RECORDED state");
        }
        if (!SavdoGraphB2Service.REORDER_SIMULATION_ANALYSIS.equals(run.getAnalysisType())
                || !SavdoGraphB2Service.TOOL_VERSION.equals(run.getToolVersion())) {
            throw new BadRequestException("Analysis run is not a current B2 reorder simulation");
        }
        if (run.getInputSnapshot() == null
                || !sha256(run.getInputSnapshot()).equals(run.getInputHash())) {
            throw new BadRequestException("Reorder simulation input snapshot is noncanonical or tampered");
        }
        JsonNode input = object(run.getInputSnapshot(), "Reorder simulation input snapshot is invalid");
        requireLong(input, "productId");
        if (!run.getPeriodFrom().toString().equals(text(input, "lookbackStart"))
                || !run.getPeriodTo().toString().equals(text(input, "lookbackEnd"))
                || !SavdoGraphB2Service.REORDER_CALCULATION_ID.equals(text(input, "calculationId"))
                || !SavdoGraphB2Service.CALCULATION_VERSION.equals(text(input, "calculationVersion"))) {
            throw new BadRequestException("Reorder simulation input does not match its authoritative run metadata");
        }
        boundedInt(input, "leadTimeDays", 0, 60);
        boundedInt(input, "safetyStockDays", 0, 90);
        boundedInt(input, "forecastHorizonDays", 1, 180);
        return input;
    }

    private ValidatedSimulation validateEvidence(
            AnalysisRun run, JsonNode runInput, List<EvidenceItem> evidence, long shopId) {
        if (evidence.size() != REQUIRED_EVIDENCE.size()) {
            throw new BadRequestException("Reorder simulation has a missing, duplicate, or unexpected evidence item");
        }
        Map<EvidenceType, EvidenceItem> byType = new EnumMap<>(EvidenceType.class);
        for (EvidenceItem item : evidence) {
            if (!Objects.equals(item.getShopId(), shopId)
                    || !Objects.equals(item.getAnalysisRunId(), run.getId())) {
                throw new BadRequestException("Reorder simulation evidence scope is invalid");
            }
            if (!SavdoGraphB2Service.REORDER_CALCULATION_ID.equals(item.getCalculationId())
                    || !SavdoGraphB2Service.CALCULATION_VERSION.equals(item.getCalculationVersion())
                    || !Objects.equals(item.getPeriodFrom(), run.getPeriodFrom())
                    || !Objects.equals(item.getPeriodTo(), run.getPeriodTo())
                    || !Objects.equals(REQUIRED_SOURCE_TYPES.get(item.getEvidenceType()), item.getSourceType())) {
                throw new BadRequestException("Reorder simulation evidence contract is not current");
            }
            if (!EvidenceContentHasher.isCanonicalAndValid(item)) {
                throw new BadRequestException("Reorder simulation evidence is noncanonical or tampered");
            }
            if (byType.put(item.getEvidenceType(), item) != null) {
                throw new BadRequestException("Reorder simulation contains conflicting evidence types");
            }
        }
        if (!byType.keySet().equals(REQUIRED_EVIDENCE)) {
            throw new BadRequestException("Reorder simulation does not contain the complete required evidence taxonomy");
        }

        long productId = requireLong(runInput, "productId");
        for (EvidenceItem item : evidence) {
            if (!Objects.equals(item.getProductId(), productId)) {
                throw new BadRequestException("Reorder simulation contains conflicting product evidence");
            }
        }

        EvidenceItem quantityEvidence = byType.get(EvidenceType.REORDER_QUANTITY);
        int reorderQuantity = positiveIntegralQuantity(quantityEvidence.getCalculatedResult());
        JsonNode quantityInput = object(quantityEvidence.getInputData(), "Reorder quantity evidence is invalid");
        int leadTimeDays = sameBoundedInt(runInput, quantityInput, "leadTimeDays", 0, 60);
        int safetyStockDays = sameBoundedInt(runInput, quantityInput, "safetyStockDays", 0, 90);
        int forecastHorizonDays = sameBoundedInt(runInput, quantityInput, "forecastHorizonDays", 1, 180);
        if (!SavdoGraphB2Service.CALCULATION_VERSION.equals(text(quantityInput, "formulaVersion"))) {
            throw new BadRequestException("Reorder quantity formula version is not current");
        }

        EvidenceItem classificationEvidence = byType.get(EvidenceType.RESULT_CLASSIFICATION);
        if (classificationEvidence.getCalculatedResult() != null) {
            throw new BadRequestException("Classification evidence must not contain a numeric result");
        }
        JsonNode classificationInput = object(
                classificationEvidence.getInputData(), "Result classification evidence is invalid");
        SavdoGraphResultClassification classification = classification(classificationInput);
        if (classification != SavdoGraphResultClassification.ESTIMATED) {
            throw new BadRequestException("Only an ESTIMATED reorder simulation is eligible for human review");
        }
        List<String> assumptions = stringList(classificationInput, "assumptions", true);
        List<String> risks = stringList(classificationInput, "risks", true);
        List<String> limitations = stringList(classificationInput, "limitations", true);
        JsonNode snapshot = classificationInput.path("snapshot");
        if (!snapshot.isObject()) {
            throw new BadRequestException("Classification evidence has no authoritative simulation snapshot");
        }

        if (requireLong(snapshot, "analysisRunId") != run.getId()
                || requireLong(snapshot, "productId") != productId
                || !classification.name().equals(text(snapshot, "classification"))
                || snapshot.path("reorderQuantity").intValue() != reorderQuantity
                || !snapshot.path("reorderQuantity").canConvertToInt()
                || !run.getPeriodFrom().toString().equals(text(snapshot, "lookbackStart"))
                || !run.getPeriodTo().toString().equals(text(snapshot, "lookbackEnd"))
                || !SavdoGraphB2Service.REORDER_CALCULATION_ID.equals(text(snapshot, "calculationId"))
                || !SavdoGraphB2Service.CALCULATION_VERSION.equals(text(snapshot, "calculationVersion"))
                || boundedInt(snapshot, "leadTimeDays", 0, 60) != leadTimeDays
                || boundedInt(snapshot, "safetyStockDays", 0, 90) != safetyStockDays
                || boundedInt(snapshot, "forecastHorizonDays", 1, 180) != forecastHorizonDays
                || !assumptions.equals(stringList(snapshot, "assumptions", true))
                || !risks.equals(stringList(snapshot, "risks", true))
                || !limitations.equals(stringList(snapshot, "limitations", true))) {
            throw new BadRequestException("Classification snapshot conflicts with canonical simulation evidence");
        }

        Set<Long> snapshotEvidenceIds = evidenceIds(snapshot.path("evidenceIds"));
        Set<Long> actualNonClassificationIds = new HashSet<>();
        for (EvidenceItem item : evidence) {
            if (item.getEvidenceType() != EvidenceType.RESULT_CLASSIFICATION) {
                actualNonClassificationIds.add(item.getId());
            }
        }
        if (!snapshotEvidenceIds.equals(actualNonClassificationIds)) {
            throw new BadRequestException("Classification snapshot does not reference the complete canonical evidence set");
        }

        int currentStock = exactInt(byType.get(EvidenceType.REORDER_CURRENT_STOCK).getCalculatedResult(),
                "Current stock evidence must be an integer");
        if (currentStock < 0
                || snapshot.path("currentOnHandQuantity").intValue() != currentStock
                || !snapshot.path("currentOnHandQuantity").canConvertToInt()
                || !decimalEquals(snapshot.path("netUnitsSold"),
                        byType.get(EvidenceType.REORDER_NET_UNITS_SOLD).getCalculatedResult())
                || !decimalEquals(snapshot.path("velocityUnitsPerDay"),
                        byType.get(EvidenceType.REORDER_VELOCITY).getCalculatedResult())
                || !text(snapshot, "stockoutRisk").equals(
                        text(object(byType.get(EvidenceType.REORDER_STOCKOUT_RISK).getInputData(),
                                "Stockout evidence is invalid"), "risk"))
                || !text(snapshot, "overstockRisk").equals(
                        text(object(byType.get(EvidenceType.REORDER_OVERSTOCK_RISK).getInputData(),
                                "Overstock evidence is invalid"), "risk"))) {
            throw new BadRequestException("Simulation result fields conflict with their canonical evidence");
        }

        List<Long> allEvidenceIds = evidence.stream()
                .map(EvidenceItem::getId)
                .sorted()
                .toList();
        return new ValidatedSimulation(productId, reorderQuantity, text(snapshot, "unit"),
                nullableText(snapshot, "productSku"), classification, assumptions, risks, limitations,
                List.copyOf(evidence), allEvidenceIds);
    }

    private void validateProductSemantics(Product product, ValidatedSimulation simulation) {
        if (!Objects.equals(product.getShopId(), TenantContext.currentShopId())) {
            throw NotFoundException.of("Mahsulot", product.getId());
        }
        EvidenceItem currentStock = item(simulation.evidence(), EvidenceType.REORDER_CURRENT_STOCK);
        EvidenceItem netUnits = item(simulation.evidence(), EvidenceType.REORDER_NET_UNITS_SOLD);
        EvidenceItem velocity = item(simulation.evidence(), EvidenceType.REORDER_VELOCITY);
        EvidenceItem quantity = item(simulation.evidence(), EvidenceType.REORDER_QUANTITY);
        EvidenceItem coverageBefore = item(simulation.evidence(), EvidenceType.REORDER_COVERAGE_BEFORE);
        EvidenceItem coverageAfter = item(simulation.evidence(), EvidenceType.REORDER_COVERAGE_AFTER);
        EvidenceItem stockout = item(simulation.evidence(), EvidenceType.REORDER_STOCKOUT_RISK);
        EvidenceItem overstock = item(simulation.evidence(), EvidenceType.REORDER_OVERSTOCK_RISK);
        EvidenceItem tiedCapital = item(simulation.evidence(), EvidenceType.REORDER_TIED_UP_CAPITAL);

        if (!Objects.equals(product.getUnit(), simulation.unit())
                || !Objects.equals(product.getBarcode(), simulation.productSku())
                || !Objects.equals(currentStock.getUnit(), product.getUnit())
                || currentStock.getCurrency() != product.getCurrency()
                || !Objects.equals(netUnits.getUnit(), product.getUnit())
                || netUnits.getCurrency() != null
                || !Objects.equals(velocity.getUnit(), "units/day")
                || velocity.getCurrency() != null
                || !Objects.equals(quantity.getUnit(), product.getUnit())
                || quantity.getCurrency() != null
                || !Objects.equals(coverageBefore.getUnit(), "days")
                || !Objects.equals(coverageAfter.getUnit(), "days")
                || !Objects.equals(stockout.getUnit(), "days")
                || !Objects.equals(overstock.getUnit(), "days")
                || tiedCapital.getCalculatedResult() != null
                || !Objects.equals(tiedCapital.getUnit(), "money")
                || tiedCapital.getCurrency() != Currency.UZS) {
            throw new BadRequestException("Product or unit semantics changed since the reorder simulation");
        }
    }

    private void appendLedger(DecisionProposal proposal, List<Long> evidenceIds, Long supplierId) {
        ActionLedgerEvent event = new ActionLedgerEvent();
        event.setShopId(proposal.getShopId());
        event.setProposalId(proposal.getId());
        event.setProposalDecisionId(null);
        event.setActor(currentActor());
        event.setEvidenceReferences(json(evidenceIds));
        event.setEventType(LEDGER_EVENT);
        event.setOutcome("SUCCESS");
        event.setPurchaseOrderId(null);
        event.setDetails("sourceAnalysisRunId=" + proposal.getAnalysisRunId()
                + ";source=" + SOURCE_KIND
                + ";supplierId=" + supplierId
                + ";classification=ESTIMATED");
        ledger.save(event);
    }

    private CreateReviewProposalResponse response(
            DecisionProposal proposal,
            Product product,
            Supplier supplier,
            ValidatedSimulation simulation,
            boolean idempotent) {
        return new CreateReviewProposalResponse(
                proposal.getId(),
                proposal.getStatus(),
                proposal.getSourceKind(),
                proposal.getAnalysisRunId(),
                product.getId(),
                product.getName(),
                supplier.getId(),
                supplier.getName(),
                proposal.getProposedReorderQuantity(),
                simulation.classification(),
                simulation.assumptions(),
                simulation.risks(),
                simulation.limitations(),
                simulation.evidenceIds(),
                proposal.getCreatedAt(),
                idempotent);
    }

    private int positiveIntegralQuantity(BigDecimal value) {
        int quantity = exactInt(value, "Reorder quantity must be an integer");
        if (quantity <= 0 || quantity > SavdoGraphB2Service.MAX_REORDER_QUANTITY) {
            throw new BadRequestException("Reorder quantity is outside the safe PurchaseOrder bounds");
        }
        return quantity;
    }

    private static int exactInt(BigDecimal value, String message) {
        if (value == null) {
            throw new BadRequestException(message);
        }
        try {
            return value.intValueExact();
        } catch (ArithmeticException ex) {
            throw new BadRequestException(message);
        }
    }

    private static EvidenceItem item(List<EvidenceItem> evidence, EvidenceType type) {
        return evidence.stream()
                .filter(value -> value.getEvidenceType() == type)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Required evidence is missing: " + type));
    }

    private static List<Long> evidenceIds(DecisionProposal proposal) {
        return proposal.getEvidenceItems().stream()
                .map(EvidenceItem::getId)
                .sorted()
                .toList();
    }

    private static String evidenceHash(List<EvidenceItem> evidence) {
        return sha256(evidence.stream()
                .map(EvidenceItem::getContentHash)
                .sorted()
                .reduce("", (left, right) -> left + "|" + right));
    }

    private Set<Long> evidenceIds(JsonNode node) {
        if (!node.isObject()) {
            throw new BadRequestException("Simulation snapshot evidence references are invalid");
        }
        Set<Long> ids = new HashSet<>();
        node.fields().forEachRemaining(entry -> {
            JsonNode value = entry.getValue();
            if (!value.isIntegralNumber() || value.longValue() <= 0 || !ids.add(value.longValue())) {
                throw new BadRequestException("Simulation snapshot contains invalid evidence references");
            }
        });
        return ids;
    }

    private static SavdoGraphResultClassification classification(JsonNode input) {
        try {
            return SavdoGraphResultClassification.valueOf(text(input, "classification"));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Simulation classification is missing or unsupported");
        }
    }

    private static List<String> stringList(JsonNode node, String field, boolean nonEmpty) {
        JsonNode value = node.path(field);
        if (!value.isArray() || (nonEmpty && value.isEmpty()) || value.size() > 30) {
            throw new BadRequestException("Simulation " + field + " are missing or invalid");
        }
        List<String> values = new ArrayList<>();
        value.forEach(item -> {
            if (!item.isTextual() || item.textValue().isBlank() || item.textValue().length() > 1000) {
                throw new BadRequestException("Simulation " + field + " contain an invalid value");
            }
            values.add(item.textValue());
        });
        return List.copyOf(values);
    }

    private static int sameBoundedInt(
            JsonNode left, JsonNode right, String field, int min, int max) {
        int expected = boundedInt(left, field, min, max);
        int actual = boundedInt(right, field, min, max);
        if (expected != actual) {
            throw new BadRequestException("Simulation assumption evidence conflicts for " + field);
        }
        return expected;
    }

    private static int boundedInt(JsonNode node, String field, int min, int max) {
        JsonNode value = node.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt()
                || value.intValue() < min || value.intValue() > max) {
            throw new BadRequestException("Simulation field is outside its safe bounds: " + field);
        }
        return value.intValue();
    }

    private static long requireLong(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new BadRequestException("Simulation field is missing or invalid: " + field);
        }
        return value.longValue();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isTextual() || value.textValue().isBlank()) {
            throw new BadRequestException("Simulation field is missing or invalid: " + field);
        }
        return value.textValue();
    }

    private static String nullableText(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isNull() || value.isMissingNode()) {
            return null;
        }
        if (!value.isTextual()) {
            throw new BadRequestException("Simulation field is invalid: " + field);
        }
        return value.textValue();
    }

    private static boolean decimalEquals(JsonNode node, BigDecimal expected) {
        return expected != null && node.isNumber() && node.decimalValue().compareTo(expected) == 0;
    }

    private JsonNode object(String value, String error) {
        try {
            JsonNode node = mapper.readTree(value);
            if (!node.isObject()) {
                throw new BadRequestException(error);
            }
            return node;
        } catch (JsonProcessingException ex) {
            throw new BadRequestException(error);
        }
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("SavdoGraph bridge metadata could not be serialized", ex);
        }
    }

    private static long requireSingleShop() {
        Long shopId = TenantContext.currentShopId();
        if (shopId == null) {
            throw new BadRequestException("SavdoGraph bridge requires one active store");
        }
        return shopId;
    }

    private static String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authenticated user is required");
        }
        return auth.getName();
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte valueByte : digest) {
                hex.append(String.format("%02x", valueByte));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    private record ValidatedSimulation(
            Long productId,
            int reorderQuantity,
            String unit,
            String productSku,
            SavdoGraphResultClassification classification,
            List<String> assumptions,
            List<String> risks,
            List<String> limitations,
            List<EvidenceItem> evidence,
            List<Long> evidenceIds) {
    }
}