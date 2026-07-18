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
            return Validation.fail("stale_or_unrelated_evidence");
        }
        for (Long evidenceId : result.evidenceIds()) {
            if (!isVisibleEvidence(evidenceId)) {
                return Validation.fail("cross_tenant_or_missing_evidence");
            }
        }
        Set<String> executedTools = new LinkedHashSet<>(state.toolsUsed());
        if (!executedTools.equals(new LinkedHashSet<>(result.toolsUsed()))) {
            return Validation.fail("tool_provenance_mismatch");
        }
        if (result.status() == CopilotStatus.ANSWERED && executedTools.isEmpty()) {
            return Validation.fail("store_answer_without_tool");
        }

        List<String> visibleText = visibleText(result);
        if (executedTools.contains(StoreCopilotSchemas.GROSS_PROFIT_TOOL)
                && visibleText.stream().anyMatch(text -> GROSS_RENAMED.matcher(text).find())) {
            return Validation.fail("gross_profit_renamed");
        }
        if (visibleText.stream().anyMatch(text -> ACTION_CLAIM.matcher(text).find())) {
            return Validation.fail("unsupported_action_claim");
        }

        Set<Long> factEvidence = new HashSet<>();
        for (CopilotFact fact : result.facts()) {
            if (fact.evidenceIds() == null || fact.evidenceIds().isEmpty()) {
                return Validation.fail("fact_without_evidence");
            }
            if (!interactionEvidence.containsAll(fact.evidenceIds())) {
                return Validation.fail("stale_or_unrelated_fact_evidence");
            }
            Set<String> supported = new HashSet<>();
            for (Long evidenceId : fact.evidenceIds()) {
                if (!isVisibleEvidence(evidenceId)) {
                    return Validation.fail("cross_tenant_or_missing_fact_evidence");
                }
                SavdoGraphResultClassification classification = state.classificationByEvidence().get(evidenceId);
                if (classification == null || classification != fact.classification()) {
                    return Validation.fail("fact_classification_mismatch");
                }
                supported.addAll(state.numbersByEvidence().getOrDefault(evidenceId, Set.of()));
                factEvidence.add(evidenceId);
            }
            if (!allClaimsSupported(join(fact.label(), fact.value(), fact.unit()), supported, permittedDates)) {
                return Validation.fail("numeric_fact_not_in_cited_evidence");
            }
        }
        if (!result.evidenceIds().containsAll(factEvidence)) {
            return Validation.fail("fact_evidence_missing_from_result");
        }

        Set<String> disclosedEvidenceSupported = new HashSet<>();
        result.evidenceIds().forEach(evidenceId -> disclosedEvidenceSupported.addAll(
                state.numbersByEvidence().getOrDefault(evidenceId, Set.of())));
        List<String> nonFactText = new ArrayList<>();
        nonFactText.add(result.answer());
        nonFactText.addAll(result.assumptions());
        nonFactText.addAll(result.limitations());
        result.suggestedNextActions().forEach(action -> nonFactText.add(action.label()));
        if (nonFactText.stream().anyMatch(text -> !allClaimsSupported(text, disclosedEvidenceSupported, permittedDates))) {
            return Validation.fail("unsupported_visible_numeric_claim");
        }
        if (!classificationPreserved(result, state.classificationByEvidence())) {
            return Validation.fail("overall_classification_mismatch");
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

    private static boolean allClaimsSupported(String text, Set<String> supported, Set<String> permittedDates) {
        String remaining = text == null ? "" : text;
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

    public record Validation(boolean valid, String reason) {
        static Validation ok() {
            return new Validation(true, "ok");
        }

        static Validation fail(String reason) {
            return new Validation(false, reason);
        }
    }
}