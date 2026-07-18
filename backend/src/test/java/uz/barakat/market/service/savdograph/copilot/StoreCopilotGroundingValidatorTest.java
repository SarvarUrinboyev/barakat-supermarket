package uz.barakat.market.service.savdograph.copilot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.SavdoGraphResultClassification;
import uz.barakat.market.dto.SavdoGraphB2Dtos.GrossProfitBriefResponse;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotFact;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotLanguage;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotStatus;
import uz.barakat.market.dto.SavdoGraphB3Dtos.StructuredCopilotResult;
import uz.barakat.market.dto.SavdoGraphB3Dtos.SuggestedActionType;
import uz.barakat.market.dto.SavdoGraphB3Dtos.SuggestedNextAction;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.service.savdograph.SavdoGraphB2Service;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotProvider.ToolCall;

class StoreCopilotGroundingValidatorTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void supportedNumericFactAndNarrativePass() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        assertThat(fixture.validator.validate(result("Gross Profit is 50.00 UZS.", "50.00", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, java.util.Set.of()).valid()).isTrue();
    }

    @Test
    void numericFactWithoutEvidenceAndValueAbsentFromToolAreRejected() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        StructuredCopilotResult missing = new StructuredCopilotResult(CopilotStatus.ANSWERED,
                CopilotLanguage.en, "Gross Profit is 50 UZS.", SavdoGraphResultClassification.VERIFIED,
                List.of(new CopilotFact("Gross Profit", "50", "UZS", List.of(),
                        SavdoGraphResultClassification.VERIFIED)), List.of(), List.of(),
                List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL), List.of(), List.of());
        assertThat(fixture.validator.validate(missing, fixture.state, java.util.Set.of()).valid()).isFalse();

        assertThat(fixture.validator.validate(result("Gross Profit is 51 UZS.", "51", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, java.util.Set.of()).valid()).isFalse();
    }

    @Test
    void crossTenantAndStaleEvidenceAreRejected() {
        Fixture crossTenant = fixture(SavdoGraphResultClassification.VERIFIED, false);
        assertThat(crossTenant.validator.validate(result("Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                crossTenant.state, java.util.Set.of()).valid()).isFalse();

        Fixture current = fixture(SavdoGraphResultClassification.VERIFIED, true);
        assertThat(current.validator.validate(result("Gross Profit is 50 UZS.", "50", 999L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                current.state, java.util.Set.of()).valid()).isFalse();
    }

    @Test
    void supportedNarrativeNumberWithoutDisclosedEvidenceIsRejected() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        StructuredCopilotResult undisclosed = new StructuredCopilotResult(CopilotStatus.ANSWERED,
                CopilotLanguage.en, "Gross Profit is 50 UZS.", SavdoGraphResultClassification.VERIFIED,
                List.of(), List.of(), List.of(), List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL),
                List.of(), List.of());
        assertThat(fixture.validator.validate(undisclosed, fixture.state, java.util.Set.of()).valid()).isFalse();
    }
    @Test
    void fabricatedNarrativeNumberAndGrossProfitRenameAreRejected() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        assertThat(fixture.validator.validate(result("Gross Profit is 50 UZS, forecast is 99.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, java.util.Set.of()).valid()).isFalse();
        assertThat(fixture.validator.validate(result("Net Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, java.util.Set.of()).valid()).isFalse();
    }

    @Test
    void verifiedCannotBeUpgradedFromEstimatedEvidence() {
        Fixture fixture = fixture(SavdoGraphResultClassification.ESTIMATED, true);
        assertThat(fixture.validator.validate(result("Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, java.util.Set.of()).valid()).isFalse();
        assertThat(fixture.validator.validate(result("Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.ESTIMATED, SavdoGraphResultClassification.ESTIMATED),
                fixture.state, java.util.Set.of()).valid()).isTrue();
    }

    @Test
    void userSuppliedIsoDateMayBeRepeatedButNotAComputedDifferentDate() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        var allowed = StoreCopilotGroundingValidator.permittedDateNumbers(
                "period 2026-07-15", List.of());
        assertThat(fixture.validator.validate(result("For 2026-07-15 Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, allowed).valid()).isTrue();
        assertThat(fixture.validator.validate(result("For 2027-07-15 Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, allowed).valid()).isFalse();
    }

    @Test
    void currentButWrongEvidenceCannotSupportAnotherBusinessValue() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        assertThat(fixture.validator.validate(result("Gross Profit is 50 UZS.", "50", 102L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, java.util.Set.of()).valid()).isFalse();
    }

    @Test
    void allVisibleNumericFieldsAreValidated() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        StructuredCopilotResult base = result("Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED);
        StructuredCopilotResult assumption = new StructuredCopilotResult(base.status(), base.language(), base.answer(),
                base.classification(), base.facts(), List.of("Forecast 99"), base.limitations(), base.toolsUsed(),
                base.evidenceIds(), base.suggestedNextActions());
        assertThat(fixture.validator.validate(assumption, fixture.state, java.util.Set.of()).valid()).isFalse();

        StructuredCopilotResult limitation = new StructuredCopilotResult(base.status(), base.language(), base.answer(),
                base.classification(), base.facts(), base.assumptions(), List.of("Limit 99"), base.toolsUsed(),
                base.evidenceIds(), base.suggestedNextActions());
        assertThat(fixture.validator.validate(limitation, fixture.state, java.util.Set.of()).valid()).isFalse();

        StructuredCopilotResult action = new StructuredCopilotResult(base.status(), base.language(), base.answer(),
                base.classification(), base.facts(), base.assumptions(), base.limitations(), base.toolsUsed(),
                base.evidenceIds(), List.of(new SuggestedNextAction(SuggestedActionType.VIEW_EVIDENCE,
                "View 99 records", true)));
        assertThat(fixture.validator.validate(action, fixture.state, java.util.Set.of()).valid()).isFalse();
    }

    @Test
    void grossProfitRenameAndOperationalClaimsFailOutsideNarrativeToo() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        StructuredCopilotResult renamed = result("Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED);
        renamed = new StructuredCopilotResult(renamed.status(), renamed.language(), renamed.answer(),
                renamed.classification(), List.of(new CopilotFact("Net Profit", "50", "UZS", List.of(101L),
                SavdoGraphResultClassification.VERIFIED)), renamed.assumptions(), renamed.limitations(),
                renamed.toolsUsed(), renamed.evidenceIds(), renamed.suggestedNextActions());
        assertThat(fixture.validator.validate(renamed, fixture.state, java.util.Set.of()).valid()).isFalse();

        StructuredCopilotResult actionClaim = new StructuredCopilotResult(CopilotStatus.ANSWERED,
                CopilotLanguage.en, "Purchase order was approved.", SavdoGraphResultClassification.VERIFIED,
                List.of(new CopilotFact("Gross Profit", "50", "UZS", List.of(101L),
                        SavdoGraphResultClassification.VERIFIED)), List.of(), List.of(),
                List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL), List.of(101L), List.of());
        assertThat(fixture.validator.validate(actionClaim, fixture.state, java.util.Set.of()).valid()).isFalse();
    }

    @Test
    void exactPermittedDateCannotAuthorizeItsDigitsAsMoney() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        var dates = StoreCopilotGroundingValidator.permittedDateNumbers("period 2026-07-15", List.of());
        assertThat(fixture.validator.validate(result("For 2026-07-15 Gross Profit is 50 UZS.", "50", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, dates).valid()).isTrue();
        assertThat(fixture.validator.validate(result("Gross Profit is 2026 UZS.", "2026", 101L,
                SavdoGraphResultClassification.VERIFIED, SavdoGraphResultClassification.VERIFIED),
                fixture.state, dates).valid()).isFalse();
    }

    @Test
    void everyFactRequiresCurrentEvidenceEvenWithoutDigits() {
        Fixture fixture = fixture(SavdoGraphResultClassification.VERIFIED, true);
        StructuredCopilotResult result = new StructuredCopilotResult(CopilotStatus.ANSWERED,
                CopilotLanguage.en, "Risk is HIGH.", SavdoGraphResultClassification.VERIFIED,
                List.of(new CopilotFact("Risk", "HIGH", null, List.of(), SavdoGraphResultClassification.VERIFIED)),
                List.of(), List.of(), List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL), List.of(), List.of());
        assertThat(fixture.validator.validate(result, fixture.state, java.util.Set.of()).valid()).isFalse();
    }
    private Fixture fixture(SavdoGraphResultClassification classification, boolean evidenceVisible) {
        SavdoGraphB2Service b2 = mock(SavdoGraphB2Service.class);
        ProductRepository products = mock(ProductRepository.class);
        EvidenceItemRepository evidence = mock(EvidenceItemRepository.class);
        when(evidence.findById(anyLong())).thenReturn(evidenceVisible
                ? Optional.of(new EvidenceItem()) : Optional.empty());
        when(b2.generateGrossProfitBrief(org.mockito.ArgumentMatchers.any())).thenReturn(brief(classification));
        StoreCopilotToolRegistry registry = new StoreCopilotToolRegistry(b2, products, mapper);
        var state = registry.newInteraction();
        registry.execute(new ToolCall("call", StoreCopilotSchemas.GROSS_PROFIT_TOOL,
                mapper.createObjectNode().put("start_date", "2026-07-15")
                        .put("end_date", "2026-07-16").put("timezone", "Asia/Tashkent")), state);
        return new Fixture(new StoreCopilotGroundingValidator(evidence), state);
    }

    private GrossProfitBriefResponse brief(SavdoGraphResultClassification classification) {
        return new GrossProfitBriefResponse(1L, "Daily Gross Profit Brief", classification,
                LocalDate.of(2026, 7, 15), LocalDate.of(2026, 7, 16), "Asia/Tashkent", Currency.UZS,
                new BigDecimal("140.00"), new BigDecimal("90.00"), new BigDecimal("50.00"),
                new BigDecimal("35.71"), "AVAILABLE", 2, 2, BigDecimal.ZERO,
                List.of(), List.of(), "DAILY_GROSS_PROFIT_BRIEF", "B2.0",
                LocalDateTime.of(2026, 7, 16, 0, 0), Map.of("grossProfit", 101L, "classification", 102L));
    }

    private StructuredCopilotResult result(String answer, String value, long evidenceId,
                                           SavdoGraphResultClassification factClassification,
                                           SavdoGraphResultClassification overallClassification) {
        return new StructuredCopilotResult(CopilotStatus.ANSWERED, CopilotLanguage.en, answer,
                overallClassification,
                List.of(new CopilotFact("Gross Profit", value, "UZS", List.of(evidenceId), factClassification)),
                List.of(), List.of(), List.of(StoreCopilotSchemas.GROSS_PROFIT_TOOL),
                List.of(evidenceId), List.of());
    }

    private record Fixture(StoreCopilotGroundingValidator validator,
                           StoreCopilotToolRegistry.InteractionState state) {
    }
}
