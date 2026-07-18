package uz.barakat.market.service.savdograph.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.Set;
import uz.barakat.market.dto.SavdoGraphB3Dtos.CopilotStatus;
import uz.barakat.market.dto.SavdoGraphB3Dtos.StructuredCopilotResult;

/** Revalidates mocked or provider-returned JSON instead of trusting schema claims. */
public final class StoreCopilotStructuredOutputParser {

    private static final Set<String> ROOT_FIELDS = Set.of("status", "language", "answer", "classification",
            "facts", "assumptions", "limitations", "tools_used", "evidence_ids", "suggested_next_actions");
    private static final Set<String> FACT_FIELDS = Set.of("label", "value", "unit", "evidence_ids", "classification");
    private static final Set<String> ACTION_FIELDS = Set.of("type", "label", "requires_human_action");
    private static final Set<CopilotStatus> MODEL_STATUSES = Set.of(CopilotStatus.ANSWERED,
            CopilotStatus.NEEDS_CLARIFICATION, CopilotStatus.INSUFFICIENT_DATA,
            CopilotStatus.UNSUPPORTED, CopilotStatus.REFUSED, CopilotStatus.ERROR);

    private final ObjectMapper mapper;

    public StoreCopilotStructuredOutputParser(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public StructuredCopilotResult parse(JsonNode root) {
        try {
            requireExactObject(root, ROOT_FIELDS);
            requireText(root, "status", 40);
            requireText(root, "language", 2);
            requireText(root, "answer", 4000);
            if (!root.path("classification").isNull()) {
                requireText(root, "classification", 32);
            }
            requireArray(root, "facts", 30).forEach(fact -> {
                requireExactObject(fact, FACT_FIELDS);
                requireText(fact, "label", 160);
                requireText(fact, "value", 160);
                if (!fact.path("unit").isNull()) {
                    requireText(fact, "unit", 40);
                }
                requirePositiveLongArray(fact, "evidence_ids", 30);
                String classification = requireText(fact, "classification", 32);
                if (!Set.of("VERIFIED", "ESTIMATED").contains(classification)) {
                    throw invalid();
                }
            });
            requireStringArray(root, "assumptions", 30, 500);
            requireStringArray(root, "limitations", 30, 500);
            requireStringArray(root, "tools_used", 5, 64);
            requirePositiveLongArray(root, "evidence_ids", 100);
            requireArray(root, "suggested_next_actions", 10).forEach(action -> {
                requireExactObject(action, ACTION_FIELDS);
                requireText(action, "type", 40);
                requireText(action, "label", 160);
                if (!action.path("requires_human_action").isBoolean()
                        || !action.path("requires_human_action").booleanValue()) {
                    throw invalid();
                }
            });
            StructuredCopilotResult result = mapper.treeToValue(root, StructuredCopilotResult.class);
            if (result.status() == null || !MODEL_STATUSES.contains(result.status())
                    || result.language() == null || result.answer() == null
                    || result.facts() == null || result.assumptions() == null || result.limitations() == null
                    || result.toolsUsed() == null || result.evidenceIds() == null
                    || result.suggestedNextActions() == null) {
                throw invalid();
            }
            return result;
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new InvalidStructuredOutputException();
        }
    }

    private static void requireExactObject(JsonNode node, Set<String> fields) {
        if (node == null || !node.isObject()) {
            throw invalid();
        }
        Set<String> actual = new HashSet<>();
        node.fieldNames().forEachRemaining(actual::add);
        if (!actual.equals(fields)) {
            throw invalid();
        }
    }

    private static String requireText(JsonNode node, String field, int maxLength) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual() || value.asText().isBlank()
                || value.asText().length() > maxLength) {
            throw invalid();
        }
        return value.asText();
    }

    private static JsonNode requireArray(JsonNode node, String field, int maxSize) {
        JsonNode value = node.get(field);
        if (value == null || !value.isArray() || value.size() > maxSize) {
            throw invalid();
        }
        return value;
    }

    private static void requireStringArray(JsonNode node, String field, int maxSize, int maxLength) {
        requireArray(node, field, maxSize).forEach(value -> {
            if (!value.isTextual() || value.asText().length() > maxLength) {
                throw invalid();
            }
        });
    }

    private static void requirePositiveLongArray(JsonNode node, String field, int maxSize) {
        requireArray(node, field, maxSize).forEach(value -> {
            if (!value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
                throw invalid();
            }
        });
    }

    private static InvalidStructuredOutputException invalid() {
        return new InvalidStructuredOutputException();
    }

    public static final class InvalidStructuredOutputException extends RuntimeException {
        public InvalidStructuredOutputException() {
            super("Provider result did not match the strict structured schema");
        }
    }
}
