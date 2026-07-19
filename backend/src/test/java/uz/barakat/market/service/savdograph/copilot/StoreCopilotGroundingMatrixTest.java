package uz.barakat.market.service.savdograph.copilot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.CLASSIFICATION_MISMATCH;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.CROSS_TENANT_OR_MISSING_EVIDENCE;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.EMPTY_FACT_EVIDENCE;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.EMPTY_RESULT_EVIDENCE;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.FACT_CLASSIFICATION_MISMATCH;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.FACT_EVIDENCE_MISSING_FROM_RESULT;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.GROSS_PROFIT_RELABELED_AS_NET;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.NARRATIVE_NUMBER_WITHOUT_EVIDENCE;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.STALE_OR_UNRELATED_EVIDENCE;
import static uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason.UNSUPPORTED_UNIT_OR_CURRENCY;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.SavdoGraphResultClassification;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefResponse;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotFact;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotLanguage;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotStatus;
import uz.barakat.market.dto.SavdoGraphB3Dtos.StructuredCopilotResult;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.service.savdograph.SavdoGraphB2Service;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.GroundingFailureReason;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotGroundingValidator.Validation;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ToolCall;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotToolRegistry.InteractionState;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotToolRegistry.ToolOutcome;

class StoreCopilotGroundingMatrixTest {

    private static final long PERIOD = 910001L;
    private static final long REVENUE = 910002L;
    private static final long REFUNDS = 910003L;
    private static final long COGS = 910004L;
    private static final long GROSS_PROFIT = 910005L;
    private static final long MARGIN = 910006L;
    private static final long COUNTS = 910007L;
    private static final long CLASSIFICATION = 910008L;
    private static final long PREVIOUS_INTERACTION_GROSS_PROFIT = 810005L;
    private static final Set<Long> ALL_VISIBLE = Set.of(PERIOD, REVENUE, REFUNDS, COGS,
            GROSS_PROFIT, MARGIN, COUNTS, CLASSIFICATION, PREVIOUS_INTERACTION_GROSS_PROFIT);
    private static final Map<String, Long> EVIDENCE_IDS = Map.ofEntries(
            Map.entry("periodTimezone", PERIOD),
            Map.entry("revenue", REVENUE),
            Map.entry("refundedRevenue", REFUNDS),
            Map.entry("cogs", COGS),
            Map.entry("grossProfit", GROSS_PROFIT),
            Map.entry("grossMargin", MARGIN),
            Map.entry("sourceRecordCounts", COUNTS),
            Map.entry("classification", CLASSIFICATION));

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void matrix1ExactLiveShapedBackendValuesAndEvidencePass() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);
        StructuredCopilotResult result = exactLiveShapedResult();

        assertPass("1 exact backend strings and evidence", fixture.validate(result));
        assertThat(result.answer()).contains("300 000 UZS", "1 250 000 UZS", "950 000 UZS", "24%");
        assertThat(result.facts()).allSatisfy(fact -> assertThat(fact.evidenceIds()).isNotEmpty());
    }

    @Test
    void matrix2Through7EquivalentFormattingPassesOnlyForExactValuesAndUnits() {
        Fixture fixture = formattingFixture();

        assertPass("2 integer", fixture.validate(gross("Yalpi foyda 12000 UZS.", "12000", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertPass("2 decimal scale", fixture.validate(gross("Yalpi foyda 12000.00 UZS.", "12000.00", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertPass("3 grouping space", fixture.validate(gross("Yalpi foyda 12 000 UZS.", "12 000", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertPass("4 grouping comma", fixture.validate(gross("Yalpi foyda 12,000.00 UZS.", "12,000.00", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertPass("5 Uzbek currency", fixture.validate(gross("Yalpi foyda 12 000 so\u2018m.", "12 000 so\u2018m", null,
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertPass("6 UZS rendering", fixture.validate(gross("Yalpi foyda 12000 UZS.", "12000", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertPass("7 integer percentage", fixture.validate(factResult("Yalpi marja 25%.", "Yalpi marja",
                "25", "%", List.of(MARGIN), List.of(MARGIN), SavdoGraphResultClassification.VERIFIED,
                SavdoGraphResultClassification.VERIFIED)));
        assertPass("7 decimal percentage", fixture.validate(factResult("Yalpi marja 25.00%.", "Yalpi marja",
                "25.00%", null, List.of(MARGIN), List.of(MARGIN), SavdoGraphResultClassification.VERIFIED,
                SavdoGraphResultClassification.VERIFIED)));
    }

    @Test
    void matrix8Through11CitationFailuresReturnExactSafeReasons() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);

        assertReason("8 top-level present, fact absent", fixture.validate(gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS", List.of(), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED)), EMPTY_FACT_EVIDENCE);
        assertReason("9 fact present, top-level absent", fixture.validate(gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS", List.of(GROSS_PROFIT), List.of(),
                SavdoGraphResultClassification.VERIFIED)), FACT_EVIDENCE_MISSING_FROM_RESULT);
        assertReason("10 previous interaction", fixture.validate(gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS", List.of(PREVIOUS_INTERACTION_GROSS_PROFIT),
                List.of(PREVIOUS_INTERACTION_GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                STALE_OR_UNRELATED_EVIDENCE);
        assertReason("11 unrelated current evidence", fixture.validate(gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS", List.of(REVENUE), List.of(REVENUE),
                SavdoGraphResultClassification.VERIFIED)), NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT);
    }

    @Test
    void matrix12Through16NarrativeDateEmptyAndModifiedReferencesAreFailClosed() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);

        assertReason("12 unsupported narrative value", fixture.validate(gross(
                "Yalpi foyda 300000 UZS, prognoz 99.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                NARRATIVE_NUMBER_WITHOUT_EVIDENCE);
        assertReason("13 evidence count is unstructured", fixture.validate(gross(
                "Yalpi foyda 300000 UZS, 3 ta dalil.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                NARRATIVE_NUMBER_WITHOUT_EVIDENCE);
        assertPass("14 exact tool period", fixture.validate(gross(
                "2026-07-19 kuni yalpi foyda 300000 UZS.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(PERIOD, GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));
        assertReason("15 empty result evidence", fixture.validate(noFacts(
                "Dalilsiz javob qabul qilinmaydi.", List.of())), EMPTY_RESULT_EVIDENCE);
        assertReason("16 modified evidence id", fixture.validate(gross(
                "Yalpi foyda 300000 UZS; dalil 910005-A.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                NARRATIVE_NUMBER_WITHOUT_EVIDENCE);
    }

    @Test
    void matrix17Through20ClassificationTerminologySerializationAndRegistrationAreExact() {
        Fixture estimated = liveFixture(SavdoGraphResultClassification.ESTIMATED, ALL_VISIBLE);
        assertReason("17 VERIFIED fact against ESTIMATED evidence", estimated.validate(gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                FACT_CLASSIFICATION_MISMATCH);

        Fixture verified = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);
        assertReason("18 Net Profit relabel", verified.validate(gross(
                "Net Profit 300000 UZS.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                GROSS_PROFIT_RELABELED_AS_NET);

        assertThat(verified.outcome().output().path("result").path("gross_profit").isNumber()).isTrue();
        assertThat(verified.outcome().output().path("result").path("calculation_version").asText())
                .isEqualTo("B2.0");
        assertPass("19 numeric JSON versus model string", verified.validate(gross(
                "Yalpi foyda 300000.00 UZS.", "300000.00", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)));

        StructuredCopilotResult afterResult = gross("Yalpi foyda 300000 UZS.", "300000", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED);
        InteractionState before = verified.registry().newInteraction();
        Validation beforeValidation = verified.validator().validate(afterResult, before, Set.of());
        assertReason("20 before tool execution", beforeValidation, STALE_OR_UNRELATED_EVIDENCE);
        assertPass("20 after tool execution", verified.validate(afterResult));
    }

    @Test
    void provenDefectsAndSecurityRegressionsAreCovered() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);

        assertReason("different value", fixture.validate(gross("Yalpi foyda 300001 UZS.", "300001", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT);
        assertReason("different currency in fact", fixture.validate(gross("Yalpi foyda 300000 USD.", "300000",
                "USD", List.of(GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED)), UNSUPPORTED_UNIT_OR_CURRENCY);

        Fixture format = formattingFixture();
        assertReason("12 ming shorthand", format.validate(gross("Yalpi foyda 12 ming UZS.", "12 ming", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT);
        assertReason("1.2 million shorthand", format.validate(gross("Yalpi foyda 1.2 million UZS.",
                "1.2 million", "UZS", List.of(GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED)), NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT);

        Fixture crossTenant = liveFixture(SavdoGraphResultClassification.VERIFIED,
                Set.of(PERIOD, REVENUE, REFUNDS, COGS, MARGIN, COUNTS, CLASSIFICATION));
        assertReason("cross tenant or missing", crossTenant.validate(gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED)),
                CROSS_TENANT_OR_MISSING_EVIDENCE);

        StructuredCopilotResult wrongOverall = factResult("Yalpi foyda 300000 UZS.", "Yalpi foyda",
                "300000", "UZS", List.of(GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.ESTIMATED);
        assertReason("overall classification mismatch", fixture.validate(wrongOverall), CLASSIFICATION_MISMATCH);
    }

    @Test
    void exactStructuredMetadataIsNotMistakenForBusinessClaims() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);
        StructuredCopilotResult result = gross(
                "B2.0 bo\u2018yicha yalpi foyda 300000 UZS; dalil ID 910005.",
                "300000", "UZS", List.of(GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED);

        assertPass("exact calculation version and disclosed evidence id", fixture.validate(result));
    }

    @Test
    void strictSchemaRequiresAtLeastOneFactEvidenceReference() {
        var responseFormat = StoreCopilotSchemas.responseFormat(mapper);
        assertThat(responseFormat.path("schema").path("properties").path("facts")
                .path("items").path("properties").path("evidence_ids").path("minItems").asInt())
                .isEqualTo(1);
    }

    @Test
    void safeDiagnosticContainsOnlyEnumPathAndCount() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);
        Validation validation = fixture.validate(gross(
                "PRIVATE RAW ANSWER 300001 UZS.", "300001", "UZS", List.of(GROSS_PROFIT),
                List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED));

        assertThat(validation.reasonCode()).isEqualTo(NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT);
        assertThat(validation.fieldPath()).isEqualTo("$.facts[0].value");
        assertThat(validation.evidenceReferenceCount()).isEqualTo(1);
        assertThat(validation.toString()).doesNotContain("PRIVATE RAW ANSWER", "300001", "UZS");
    }

    @Test
    void everyAdditionalValidatorRejectionBranchHasAnExactReason() {
        Fixture fixture = liveFixture(SavdoGraphResultClassification.VERIFIED, ALL_VISIBLE);
        StructuredCopilotResult valid = gross("Yalpi foyda 300000 UZS.", "300000", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED);

        StructuredCopilotResult wrongTools = new StructuredCopilotResult(
                valid.status(), valid.language(), valid.answer(), valid.classification(), valid.facts(),
                valid.assumptions(), valid.limitations(), List.of(), valid.evidenceIds(),
                valid.suggestedNextActions());
        assertReason("tool provenance", fixture.validate(wrongTools),
                GroundingFailureReason.TOOL_PROVENANCE_MISMATCH);

        StructuredCopilotResult noToolAnswer = new StructuredCopilotResult(
                CopilotStatus.ANSWERED, CopilotLanguage.uz, "Dalilsiz javob.",
                SavdoGraphResultClassification.UNSUPPORTED, List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of());
        Validation noToolValidation = fixture.validator().validate(
                noToolAnswer, fixture.registry().newInteraction(), Set.of());
        assertReason("answered store question without a tool", noToolValidation,
                GroundingFailureReason.STORE_ANSWER_WITHOUT_TOOL);

        assertReason("unsupported action claim", fixture.validate(gross(
                "Purchase order was approved. Yalpi foyda 300000 UZS.", "300000", "UZS",
                List.of(GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED)),
                GroundingFailureReason.UNSUPPORTED_ACTION_CLAIM);

        StructuredCopilotResult staleFact = gross(
                "Yalpi foyda 300000 UZS.", "300000", "UZS",
                List.of(PREVIOUS_INTERACTION_GROSS_PROFIT), List.of(GROSS_PROFIT),
                SavdoGraphResultClassification.VERIFIED);
        assertReason("stale fact evidence", fixture.validate(staleFact),
                GroundingFailureReason.STALE_OR_UNRELATED_FACT_EVIDENCE);

        Fixture hiddenCogs = liveFixture(SavdoGraphResultClassification.VERIFIED,
                Set.of(PERIOD, REVENUE, REFUNDS, GROSS_PROFIT, MARGIN, COUNTS, CLASSIFICATION));
        StructuredCopilotResult hiddenFact = factResult(
                "Transaction-time COGS 950000 UZS.", "Transaction-time COGS", "950000", "UZS",
                List.of(COGS), List.of(GROSS_PROFIT), SavdoGraphResultClassification.VERIFIED,
                SavdoGraphResultClassification.VERIFIED);
        assertReason("cross-tenant or missing fact evidence", hiddenCogs.validate(hiddenFact),
                GroundingFailureReason.CROSS_TENANT_OR_MISSING_FACT_EVIDENCE);
    }

    private Fixture liveFixture(SavdoGraphResultClassification classification, Set<Long> visible) {
        return fixture(brief(new BigDecimal("300000.00"), new BigDecimal("24.00"), classification), visible);
    }

    private Fixture formattingFixture() {
        return fixture(brief(new BigDecimal("12000.00"), new BigDecimal("25.00"),
                SavdoGraphResultClassification.VERIFIED), ALL_VISIBLE);
    }

    private Fixture fixture(GrossProfitBriefResponse brief, Set<Long> visible) {
        SavdoGraphB2Service b2 = mock(SavdoGraphB2Service.class);
        ProductRepository products = mock(ProductRepository.class);
        EvidenceItemRepository evidence = mock(EvidenceItemRepository.class);
        when(evidence.findById(anyLong())).thenAnswer(invocation ->
                visible.contains(invocation.getArgument(0, Long.class))
                        ? Optional.of(new EvidenceItem()) : Optional.empty());
        when(b2.generateGrossProfitBrief(any())).thenReturn(brief);
        StoreCopilotToolRegistry registry = new StoreCopilotToolRegistry(b2, products, mapper);
        InteractionState state = registry.newInteraction();
        ToolOutcome outcome = registry.execute(new ToolCall("gross_call", StoreCopilotSchemas.GROSS_PROFIT_TOOL,
                mapper.createObjectNode().put("start_date", "2026-07-19")
                        .put("end_date", "2026-07-20").put("timezone", "Asia/Tashkent")), state);
        return new Fixture(new StoreCopilotGroundingValidator(evidence), registry, state, outcome);
    }

    private GrossProfitBriefResponse brief(BigDecimal grossProfit, BigDecimal margin,
                                            SavdoGraphResultClassification classification) {
        BigDecimal revenue = grossProfit.compareTo(new BigDecimal("12000")) == 0
                ? new BigDecimal("48000.00") : new BigDecimal("1250000.00");
        BigDecimal cogs = revenue.subtract(grossProfit);
        return new GrossProfitBriefResponse(700001L, "Daily Gross Profit Brief", classification,
                LocalDate.of(2026, 7, 19), LocalDate.of(2026, 7, 20), "Asia/Tashkent", Currency.UZS,
                revenue, cogs, grossProfit, margin, "AVAILABLE", 8, 12, new BigDecimal("50000.00"),
                List.of("Deterministic synthetic fixture"), List.of("Gross Profit is not Net Profit"),
                "DAILY_GROSS_PROFIT_BRIEF", "B2.0", LocalDateTime.of(2026, 7, 20, 0, 0), EVIDENCE_IDS);
    }

    private StructuredCopilotResult exactLiveShapedResult() {
        return new StructuredCopilotResult(CopilotStatus.ANSWERED, CopilotLanguage.uz,
                "Bugungi yalpi foyda 300 000 UZS. Dalillar: tushum 1 250 000 UZS, "
                        + "qaytarilgan summa 50 000 UZS, transaction-time COGS 950 000 UZS, "
                        + "yalpi marja 24%, 8 ta yakunlangan savdo va 12 ta manba qatori.",
                SavdoGraphResultClassification.VERIFIED,
                List.of(
                        fact("Tushum", "1 250 000", "UZS", REVENUE),
                        fact("Qaytarilgan summa", "50 000", "UZS", REFUNDS),
                        fact("Transaction-time COGS", "950 000", "UZS", COGS),
                        fact("Yalpi foyda", "300 000", "UZS", GROSS_PROFIT),
                        fact("Yalpi marja", "24", "%", MARGIN),
                        fact("Yakunlangan savdolar", "8", null, COUNTS),
                        fact("Manba qatorlari", "12", null, COUNTS)),
                List.of(), List.of(),
                List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL),
                List.of(PERIOD, REVENUE, REFUNDS, COGS, GROSS_PROFIT, MARGIN, COUNTS, CLASSIFICATION),
                List.of());
    }

    private CopilotFact fact(String label, String value, String unit, long evidenceId) {
        return new CopilotFact(label, value, unit, List.of(evidenceId),
                SavdoGraphResultClassification.VERIFIED);
    }

    private StructuredCopilotResult gross(String answer, String value, String unit, List<Long> factIds,
                                           List<Long> topIds,
                                           SavdoGraphResultClassification factClassification) {
        return factResult(answer, "Yalpi foyda", value, unit, factIds, topIds,
                factClassification, factClassification);
    }

    private StructuredCopilotResult factResult(String answer, String label, String value, String unit,
                                               List<Long> factIds, List<Long> topIds,
                                               SavdoGraphResultClassification factClassification,
                                               SavdoGraphResultClassification overallClassification) {
        return new StructuredCopilotResult(CopilotStatus.ANSWERED, CopilotLanguage.uz, answer,
                overallClassification,
                List.of(new CopilotFact(label, value, unit, factIds, factClassification)),
                List.of(), List.of(), List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL), topIds, List.of());
    }

    private StructuredCopilotResult noFacts(String answer, List<Long> topIds) {
        return new StructuredCopilotResult(CopilotStatus.ANSWERED, CopilotLanguage.uz, answer,
                SavdoGraphResultClassification.VERIFIED, List.of(), List.of(), List.of(),
                List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL), topIds, List.of());
    }

    private static void assertPass(String label, Validation validation) {
        assertThat(validation.valid()).as(label + ": " + validation).isTrue();
        assertThat(validation.reasonCode()).as(label).isEqualTo(GroundingFailureReason.NONE);
    }

    private static void assertReason(String label, Validation validation, GroundingFailureReason expected) {
        assertThat(validation.valid()).as(label + ": " + validation).isFalse();
        assertThat(validation.reasonCode()).as(label).isEqualTo(expected);
    }

    private record Fixture(StoreCopilotGroundingValidator validator, StoreCopilotToolRegistry registry,
                           InteractionState state, ToolOutcome outcome) {
        private Validation validate(StructuredCopilotResult result) {
            return validator.validate(result, state, Set.of());
        }
    }
}
