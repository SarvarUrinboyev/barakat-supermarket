package uz.barakat.market.service.savdograph.copilot;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import uz.barakat.market.domain.SavdoGraphResultClassification;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotFact;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotStatus;
import uz.barakat.market.dto.SavdoGraphB3Dtos.StructuredCopilotResult;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotToolRegistry.InteractionState;

/** Fail-closed evidence and numeric-claim validation after Structured Outputs parsing. */
@Component
public class StoreCopilotGroundingValidator {

    private static final Pattern NUMBER = Pattern.compile(
            "(?<![\\p{L}\\p{N}])[-+]?(?:\\d{1,3}(?:[ \\u00A0\\u202F,'’.]\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?)(?![\\p{L}\\p{N}])");
    private static final Pattern ISO_DATE = Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2}\\b");
    private static final Pattern CURRENCY_TOKEN = Pattern.compile(
            "(?iu)\\b(?:UZS|USD|EUR|RUB|KZT|GBP)\\b|so['\\x{2019}\\x{2018}\\x{02BB}`]?m|\\x{0441}[\\x{045E}\\x{0443}]\\x{043C}");
    private static final Pattern PERCENT_TOKEN = Pattern.compile(
            "(?iu)%|\\b(?:percent|foiz)\\b");
    private static final Pattern GROSS_RENAMED = Pattern.compile(
            "(?iu)\\b(net profit|net income|final profit|sof foyda|чистая прибыль)\\b");
    private static final Pattern ACTION_CLAIM = Pattern.compile(
            "(?iu)\\b(?:purchase order|order)\\s+(?:was\\s+)?(?:approved|created|placed|sent|executed)\\b"
                    + "|\\bpayment\\s+(?:was\\s+)?(?:sent|made|completed)\\b"
                    + "|\\b(?:inventory|price)\\s+(?:was\\s+)?(?:adjusted|changed|updated)\\b"
                    + "|\\bsupplier\\s+(?:was\\s+)?(?:contacted|messaged)\\b"
                    + "|\\b(?:заказ|оплата)\\s+(?:одобрен|создан|отправлен|выполнена)\\b"
                    + "|\\b(?:buyurtma|to'lov|narx)\\s+(?:tasdiqlandi|yaratildi|berildi|yuborildi|o'zgartirildi|yangilandi)\\b");

    private final EvidenceItemRepository evidence;

    public StoreCopilotGroundingValidator(EvidenceItemRepository evidence) {
        this.evidence = evidence;
    }

    public Validation validate(StructuredCopilotResult result, InteractionState state,
                               Set<String> permittedDates) {
        Set<Long> interactionEvidence = state.evidenceIds();
        if (!interactionEvidence.containsAll(result.evidenceIds())) {
            return Validation.fail(GroundingFailureReason.STALE_OR_UNRELATED_EVIDENCE,
                    "$.evidence_ids", result.evidenceIds().size());
        }
        for (int index = 0; index < result.evidenceIds().size(); index++) {
            Long evidenceId = result.evidenceIds().get(index);
            if (!isVisibleEvidence(evidenceId)) {
                return Validation.fail(GroundingFailureReason.CROSS_TENANT_OR_MISSING_EVIDENCE,
                        "$.evidence_ids[" + index + "]", result.evidenceIds().size());
            }
        }
        Set<String> executedTools = new LinkedHashSet<>(state.toolsUsed());
        if (!executedTools.equals(new LinkedHashSet<>(result.toolsUsed()))) {
            return Validation.fail(GroundingFailureReason.TOOL_PROVENANCE_MISMATCH,
                    "$.tools_used", result.evidenceIds().size());
        }
        if (result.status() == CopilotStatus.ANSWERED && executedTools.isEmpty()) {
            return Validation.fail(GroundingFailureReason.STORE_ANSWER_WITHOUT_TOOL,
                    "$.status", result.evidenceIds().size());
        }

        List<String> visibleText = visibleText(result);
        if (executedTools.contains(StoreCopilotSchemas.GROSS_PROFIT_TOOL)
                && visibleText.stream().anyMatch(text -> GROSS_RENAMED.matcher(text).find())) {
            return Validation.fail(GroundingFailureReason.GROSS_PROFIT_RELABELED_AS_NET,
                    "$.answer_or_facts", result.evidenceIds().size());
        }
        if (visibleText.stream().anyMatch(text -> ACTION_CLAIM.matcher(text).find())) {
            return Validation.fail(GroundingFailureReason.UNSUPPORTED_ACTION_CLAIM,
                    "$.answer_or_actions", result.evidenceIds().size());
        }

        Set<Long> factEvidence = new HashSet<>();
        for (int factIndex = 0; factIndex < result.facts().size(); factIndex++) {
            CopilotFact fact = result.facts().get(factIndex);
            String factPath = "$.facts[" + factIndex + "]";
            if (fact.evidenceIds() == null || fact.evidenceIds().isEmpty()) {
                return Validation.fail(GroundingFailureReason.EMPTY_FACT_EVIDENCE,
                        factPath + ".evidence_ids", 0);
            }
            if (!interactionEvidence.containsAll(fact.evidenceIds())) {
                return Validation.fail(GroundingFailureReason.STALE_OR_UNRELATED_FACT_EVIDENCE,
                        factPath + ".evidence_ids", fact.evidenceIds().size());
            }
            Set<String> supported = new HashSet<>();
            Set<String> supportedUnits = new HashSet<>();
            for (Long evidenceId : fact.evidenceIds()) {
                if (!isVisibleEvidence(evidenceId)) {
                    return Validation.fail(GroundingFailureReason.CROSS_TENANT_OR_MISSING_FACT_EVIDENCE,
                            factPath + ".evidence_ids", fact.evidenceIds().size());
                }
                SavdoGraphResultClassification classification = state.classificationByEvidence().get(evidenceId);
                if (classification == null || classification != fact.classification()) {
                    return Validation.fail(GroundingFailureReason.FACT_CLASSIFICATION_MISMATCH,
                            factPath + ".classification", fact.evidenceIds().size());
                }
                supported.addAll(state.numbersByEvidence().getOrDefault(evidenceId, Set.of()));
                supportedUnits.addAll(state.unitsByEvidence().getOrDefault(evidenceId, Set.of()));
                factEvidence.add(evidenceId);
            }
            if (!allClaimsSupported(join(fact.label(), fact.value(), fact.unit()),
                    supported, permittedDates, Set.of())) {
                return Validation.fail(GroundingFailureReason.NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT,
                        factPath + ".value", fact.evidenceIds().size());
            }
            if (!factUnitsSupported(fact, supportedUnits)) {
                return Validation.fail(GroundingFailureReason.UNSUPPORTED_UNIT_OR_CURRENCY,
                        factPath + ".unit", fact.evidenceIds().size());
            }
        }
        if (!result.evidenceIds().containsAll(factEvidence)) {
            return Validation.fail(GroundingFailureReason.FACT_EVIDENCE_MISSING_FROM_RESULT,
                    "$.evidence_ids", result.evidenceIds().size());
        }
        if (result.status() == CopilotStatus.ANSWERED && result.evidenceIds().isEmpty()) {
            return Validation.fail(GroundingFailureReason.EMPTY_RESULT_EVIDENCE,
                    "$.evidence_ids", 0);
        }

        Set<String> disclosedEvidenceSupported = new HashSet<>();
        Set<String> disclosedUnits = new HashSet<>();
        result.evidenceIds().forEach(evidenceId -> disclosedEvidenceSupported.addAll(
                state.numbersByEvidence().getOrDefault(evidenceId, Set.of())));
        result.evidenceIds().forEach(evidenceId -> disclosedUnits.addAll(
                state.unitsByEvidence().getOrDefault(evidenceId, Set.of())));
        Set<String> permittedMetadata = new HashSet<>(state.metadataTokens());
        result.evidenceIds().forEach(evidenceId -> permittedMetadata.add(evidenceId.toString()));
        List<String> nonFactText = new ArrayList<>();
        nonFactText.add(result.answer());
        nonFactText.addAll(result.assumptions());
        nonFactText.addAll(result.limitations());
        result.suggestedNextActions().forEach(action -> nonFactText.add(action.label()));
        if (nonFactText.stream().anyMatch(text -> !allClaimsSupported(
                text, disclosedEvidenceSupported, permittedDates, permittedMetadata))) {
            return Validation.fail(GroundingFailureReason.NARRATIVE_NUMBER_WITHOUT_EVIDENCE,
                    "$.answer_or_visible_metadata", result.evidenceIds().size());
        }
        if (nonFactText.stream().anyMatch(text -> !narrativeCurrenciesSupported(text, disclosedUnits))) {
            return Validation.fail(GroundingFailureReason.UNSUPPORTED_UNIT_OR_CURRENCY,
                    "$.answer_or_visible_metadata", result.evidenceIds().size());
        }
        if (!classificationPreserved(result, state.classificationByEvidence())) {
            return Validation.fail(GroundingFailureReason.CLASSIFICATION_MISMATCH,
                    "$.classification", result.evidenceIds().size());
        }
        return Validation.ok();
    }

    /** Exact query/context dates, not their reusable numeric components. */
    public static Set<String> permittedDateNumbers(String question, List<String> contextDates) {
        Set<String> result = new HashSet<>();
        addDates(question, result);
        contextDates.forEach(value -> addDates(value, result));
        return Set.copyOf(result);
    }

    private boolean isVisibleEvidence(Long evidenceId) {
        try {
            return evidence.findById(evidenceId).isPresent();
        } catch (NotFoundException ex) {
            return false;
        }
    }

    private static void addDates(String text, Set<String> target) {
        Matcher matcher = ISO_DATE.matcher(text == null ? "" : text);
        while (matcher.find()) {
            target.add(matcher.group());
        }
    }

    private static boolean allClaimsSupported(String text, Set<String> supported, Set<String> permittedDates,
                                              Set<String> permittedMetadata) {
        String remaining = text == null ? "" : text;
        for (String metadata : permittedMetadata.stream()
                .filter(value -> value != null && !value.isBlank())
                .sorted((left, right) -> Integer.compare(right.length(), left.length())).toList()) {
            remaining = exactToken(metadata).matcher(remaining).replaceAll(" ");
        }
        Set<String> allowedDates = new HashSet<>(permittedDates);
        supported.stream().filter(value -> ISO_DATE.matcher(value).matches()).forEach(allowedDates::add);
        Matcher dateMatcher = ISO_DATE.matcher(remaining);
        while (dateMatcher.find()) {
            if (!allowedDates.contains(dateMatcher.group())) {
                return false;
            }
        }
        for (String date : allowedDates) {
            remaining = remaining.replace(date, " ");
        }
        Matcher matcher = NUMBER.matcher(remaining);
        while (matcher.find()) {
            String normalized = normalize(matcher.group());
            if (!supported.contains(normalized)) {
                return false;
            }
        }
        return true;
    }

    private static Pattern exactToken(String value) {
        return Pattern.compile("(?<![\\p{L}\\p{N}_-])" + Pattern.quote(value)
                + "(?![\\p{L}\\p{N}_-])");
    }

    private static boolean factUnitsSupported(CopilotFact fact, Set<String> supportedUnits) {
        if (supportedUnits.isEmpty()) {
            return true;
        }
        String visible = join(fact.label(), fact.value(), fact.unit());
        Set<String> expectedCurrencies = supportedUnits.stream()
                .filter(unit -> !"%".equals(unit))
                .map(unit -> unit.toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        Set<String> actualCurrencies = currencies(visible);
        if (!expectedCurrencies.isEmpty()
                && (actualCurrencies.isEmpty() || !expectedCurrencies.containsAll(actualCurrencies))) {
            return false;
        }
        return !supportedUnits.contains("%") || PERCENT_TOKEN.matcher(visible).find();
    }

    private static boolean narrativeCurrenciesSupported(String text, Set<String> supportedUnits) {
        Set<String> actual = currencies(text);
        if (actual.isEmpty()) {
            return true;
        }
        Set<String> expected = supportedUnits.stream()
                .filter(unit -> !"%".equals(unit))
                .map(unit -> unit.toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        return !expected.isEmpty() && expected.containsAll(actual);
    }

    private static Set<String> currencies(String text) {
        Set<String> result = new HashSet<>();
        Matcher matcher = CURRENCY_TOKEN.matcher(text == null ? "" : text);
        while (matcher.find()) {
            String token = matcher.group();
            String lower = token.toLowerCase(Locale.ROOT);
            if (lower.startsWith("so") || (!lower.isEmpty() && lower.codePointAt(0) == 0x0441)) {
                result.add("UZS");
            } else {
                result.add(token.toUpperCase(Locale.ROOT));
            }
        }
        return result;
    }

    private static String join(String... values) {
        StringBuilder result = new StringBuilder();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                result.append(value).append(' ');
            }
        }
        return result.toString();
    }

    private static List<String> visibleText(StructuredCopilotResult result) {
        List<String> visible = new ArrayList<>();
        visible.add(result.answer());
        result.facts().forEach(fact -> visible.add(join(fact.label(), fact.value(), fact.unit())));
        visible.addAll(result.assumptions());
        visible.addAll(result.limitations());
        result.suggestedNextActions().forEach(action -> visible.add(action.label()));
        return visible;
    }

    private static boolean classificationPreserved(StructuredCopilotResult result,
                                                    Map<Long, SavdoGraphResultClassification> byEvidence) {
        if (byEvidence.isEmpty()) {
            return result.classification() == null
                    || result.classification() == SavdoGraphResultClassification.UNSUPPORTED;
        }
        SavdoGraphResultClassification expected = byEvidence.values().stream()
                .reduce(StoreCopilotGroundingValidator::moreConservative).orElse(null);
        return result.classification() == expected;
    }

    private static SavdoGraphResultClassification moreConservative(
            SavdoGraphResultClassification left, SavdoGraphResultClassification right) {
        return rank(left) >= rank(right) ? left : right;
    }

    private static int rank(SavdoGraphResultClassification value) {
        return switch (value) {
            case VERIFIED -> 0;
            case ESTIMATED -> 1;
            case INSUFFICIENT_DATA -> 2;
            case UNSUPPORTED -> 3;
        };
    }

    private static String normalize(String raw) {
        String compact = raw.replace(" ", "").replace("\u00A0", "").replace("\u202F", "")
                .replace("'", "").replace("’", "").toLowerCase(Locale.ROOT);
        int comma = compact.lastIndexOf(',');
        int dot = compact.lastIndexOf('.');
        if (comma >= 0 && dot >= 0) {
            int decimal = Math.max(comma, dot);
            char separator = compact.charAt(decimal);
            String integer = compact.substring(0, decimal).replace(",", "").replace(".", "");
            compact = integer + "." + compact.substring(decimal + 1);
        } else if (comma >= 0) {
            int digitsAfter = compact.length() - comma - 1;
            if (compact.indexOf(',') != comma || (digitsAfter == 3 && comma > 0 && compact.charAt(0) != '0')) {
                compact = compact.replace(",", "");
            } else {
                compact = compact.replace(',', '.');
            }
        }
        try {
            return new BigDecimal(compact).stripTrailingZeros().toPlainString();
        } catch (NumberFormatException ex) {
            return compact;
        }
    }

    public enum GroundingFailureReason {
        NONE("ok"),
        STALE_OR_UNRELATED_EVIDENCE("stale_or_unrelated_evidence"),
        CROSS_TENANT_OR_MISSING_EVIDENCE("cross_tenant_or_missing_evidence"),
        TOOL_PROVENANCE_MISMATCH("tool_provenance_mismatch"),
        STORE_ANSWER_WITHOUT_TOOL("store_answer_without_tool"),
        GROSS_PROFIT_RELABELED_AS_NET("gross_profit_renamed"),
        UNSUPPORTED_ACTION_CLAIM("unsupported_action_claim"),
        EMPTY_FACT_EVIDENCE("fact_without_evidence"),
        EMPTY_RESULT_EVIDENCE("answer_without_evidence"),
        STALE_OR_UNRELATED_FACT_EVIDENCE("stale_or_unrelated_fact_evidence"),
        CROSS_TENANT_OR_MISSING_FACT_EVIDENCE("cross_tenant_or_missing_fact_evidence"),
        FACT_CLASSIFICATION_MISMATCH("fact_classification_mismatch"),
        NUMERIC_VALUE_NOT_IN_TOOL_OUTPUT("numeric_fact_not_in_cited_evidence"),
        UNSUPPORTED_UNIT_OR_CURRENCY("unsupported_unit_or_currency"),
        FACT_EVIDENCE_MISSING_FROM_RESULT("fact_evidence_missing_from_result"),
        NARRATIVE_NUMBER_WITHOUT_EVIDENCE("unsupported_visible_numeric_claim"),
        CLASSIFICATION_MISMATCH("overall_classification_mismatch");

        private final String code;

        GroundingFailureReason(String code) {
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    /** Privacy-safe internal diagnostic: no provider text, tenant ID, credential, or raw payload. */
    public record Validation(boolean valid, GroundingFailureReason reasonCode,
                             String fieldPath, int evidenceReferenceCount) {
        public String reason() {
            return reasonCode.code();
        }

        static Validation ok() {
            return new Validation(true, GroundingFailureReason.NONE, "$", 0);
        }

        static Validation fail(GroundingFailureReason reason, String fieldPath,
                               int evidenceReferenceCount) {
            return new Validation(false, reason, fieldPath, evidenceReferenceCount);
        }
    }
}
