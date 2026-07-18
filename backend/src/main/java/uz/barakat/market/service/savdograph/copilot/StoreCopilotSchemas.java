package uz.barakat.market.service.savdograph.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;

/** Server-owned strict schemas. Clients and model output cannot register tools. */
public final class StoreCopilotSchemas {

    public static final String GROSS_PROFIT_TOOL = "get_daily_gross_profit_brief";
    public static final String PRODUCT_SEARCH_TOOL = "search_store_products";
    public static final String REORDER_TOOL = "run_reorder_simulation";

    private StoreCopilotSchemas() {
    }

    public static ArrayNode tools(ObjectMapper mapper) {
        ArrayNode tools = mapper.createArrayNode();
        tools.add(function(mapper, GROSS_PROFIT_TOOL,
                "Create and return the tenant-scoped deterministic B2 Gross Profit Brief. Never Net Profit.",
                object(mapper,
                        property(mapper, "start_date", dateString(mapper, "Inclusive ISO date.")),
                        property(mapper, "end_date", dateString(mapper, "Exclusive ISO date; at most 31 days after start.")),
                        property(mapper, "timezone", enumString(mapper, "Validated business timezone.", "Asia/Tashkent"))),
                List.of("start_date", "end_date", "timezone")));
        tools.add(function(mapper, PRODUCT_SEARCH_TOOL,
                "Find at most ten existing tenant-owned product candidates by display name or barcode. It never chooses among ambiguous results.",
                object(mapper,
                        property(mapper, "query", boundedString(mapper, "Untrusted human product description.", 1, 120)),
                        property(mapper, "limit", boundedInteger(mapper, "Maximum candidates.", 1, 10))),
                List.of("query", "limit")));
        tools.add(function(mapper, REORDER_TOOL,
                "Run the committed deterministic B2 read-only reorder scenario for a product resolved in this interaction.",
                object(mapper,
                        property(mapper, "product_id", boundedInteger(mapper, "Resolved tenant-owned product ID; never a tenant authority.", 1, Long.MAX_VALUE)),
                        property(mapper, "lookback_days", boundedInteger(mapper, "Trailing deterministic sales window ending today.", 1, 90)),
                        property(mapper, "lead_time_days", boundedInteger(mapper, "Visible scenario assumption.", 0, 60)),
                        property(mapper, "safety_stock_days", boundedInteger(mapper, "Visible scenario assumption.", 0, 90)),
                        property(mapper, "forecast_horizon_days", boundedInteger(mapper, "Visible scenario assumption.", 1, 180))),
                List.of("product_id", "lookback_days", "lead_time_days",
                        "safety_stock_days", "forecast_horizon_days")));
        return tools;
    }

    public static ObjectNode responseFormat(ObjectMapper mapper) {
        ObjectNode fact = object(mapper,
                property(mapper, "label", boundedString(mapper, "Short localized fact label.", 1, 160)),
                property(mapper, "value", boundedString(mapper, "Tool-grounded display value.", 1, 160)),
                property(mapper, "unit", nullableBoundedString(mapper, "Display unit or null.", 40)),
                property(mapper, "evidence_ids", array(mapper, integer(mapper, "Immutable repository evidence ID."), 30)),
                property(mapper, "classification", enumString(mapper, "Exact fact classification.", "VERIFIED", "ESTIMATED")));
        fact.set("required", strings(mapper, "label", "value", "unit", "evidence_ids", "classification"));

        ObjectNode action = object(mapper,
                property(mapper, "type", enumString(mapper, "Bounded human action.", "VIEW_EVIDENCE",
                        "RUN_SIMULATION", "REVIEW_PROPOSAL", "ASK_CLARIFICATION")),
                property(mapper, "label", boundedString(mapper, "Localized action label.", 1, 160)),
                property(mapper, "requires_human_action", trueOnly(mapper)));
        action.set("required", strings(mapper, "type", "label", "requires_human_action"));

        ObjectNode schema = object(mapper,
                property(mapper, "status", enumString(mapper, "Safe result status.", "ANSWERED",
                        "NEEDS_CLARIFICATION", "INSUFFICIENT_DATA", "UNSUPPORTED", "REFUSED", "ERROR")),
                property(mapper, "language", enumString(mapper, "Answer language.", "uz", "ru", "en")),
                property(mapper, "answer", boundedString(mapper, "Concise user-facing explanation; no hidden reasoning.", 1, 4000)),
                property(mapper, "classification", nullableEnumString(mapper, "Overall classification or null.",
                        "VERIFIED", "ESTIMATED", "INSUFFICIENT_DATA", "UNSUPPORTED")),
                property(mapper, "facts", array(mapper, fact, 30)),
                property(mapper, "assumptions", array(mapper, boundedString(mapper, "Visible assumption.", 1, 500), 30)),
                property(mapper, "limitations", array(mapper, boundedString(mapper, "Visible limitation.", 1, 500), 30)),
                property(mapper, "tools_used", array(mapper, enumString(mapper, "Server-registered tool name.",
                        GROSS_PROFIT_TOOL, PRODUCT_SEARCH_TOOL, REORDER_TOOL), 5)),
                property(mapper, "evidence_ids", array(mapper, integer(mapper, "Immutable repository evidence ID."), 100)),
                property(mapper, "suggested_next_actions", array(mapper, action, 10)));
        schema.set("required", strings(mapper, "status", "language", "answer", "classification", "facts",
                "assumptions", "limitations", "tools_used", "evidence_ids", "suggested_next_actions"));

        ObjectNode format = mapper.createObjectNode();
        format.put("type", "json_schema");
        format.put("name", "savdograph_store_copilot_result");
        format.put("strict", true);
        format.set("schema", schema);
        return format;
    }

    private static ObjectNode function(ObjectMapper mapper, String name, String description,
                                       ObjectNode parameters, List<String> required) {
        parameters.set("required", strings(mapper, required.toArray(String[]::new)));
        ObjectNode tool = mapper.createObjectNode();
        tool.put("type", "function");
        tool.put("name", name);
        tool.put("description", description);
        tool.put("strict", true);
        tool.set("parameters", parameters);
        return tool;
    }

    @SafeVarargs
    private static ObjectNode object(ObjectMapper mapper, java.util.Map.Entry<String, JsonNode>... properties) {
        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode node = schema.putObject("properties");
        for (var property : properties) {
            node.set(property.getKey(), property.getValue());
        }
        schema.put("additionalProperties", false);
        return schema;
    }

    private static java.util.Map.Entry<String, JsonNode> property(ObjectMapper mapper, String name, JsonNode schema) {
        return java.util.Map.entry(name, schema);
    }

    private static ObjectNode string(ObjectMapper mapper, String description) {
        ObjectNode node = mapper.createObjectNode();
        node.put("type", "string");
        node.put("description", description);
        return node;
    }

    private static ObjectNode boundedString(ObjectMapper mapper, String description, int min, int max) {
        ObjectNode node = string(mapper, description);
        node.put("minLength", min);
        node.put("maxLength", max);
        return node;
    }

    private static ObjectNode dateString(ObjectMapper mapper, String description) {
        ObjectNode node = boundedString(mapper, description, 10, 10);
        node.put("pattern", "^\\d{4}-\\d{2}-\\d{2}$");
        return node;
    }

    private static ObjectNode nullableBoundedString(ObjectMapper mapper, String description, int max) {
        ObjectNode node = nullableString(mapper, description);
        node.put("maxLength", max);
        return node;
    }
    private static ObjectNode nullableString(ObjectMapper mapper, String description) {
        ObjectNode node = mapper.createObjectNode();
        node.set("type", strings(mapper, "string", "null"));
        node.put("description", description);
        return node;
    }

    private static ObjectNode enumString(ObjectMapper mapper, String description, String... values) {
        ObjectNode node = string(mapper, description);
        node.set("enum", strings(mapper, values));
        return node;
    }

    private static ObjectNode nullableEnumString(ObjectMapper mapper, String description, String... values) {
        ObjectNode node = nullableString(mapper, description);
        ArrayNode enums = strings(mapper, values);
        enums.addNull();
        node.set("enum", enums);
        return node;
    }

    private static ObjectNode integer(ObjectMapper mapper, String description) {
        ObjectNode node = mapper.createObjectNode();
        node.put("type", "integer");
        node.put("description", description);
        return node;
    }

    private static ObjectNode boundedInteger(ObjectMapper mapper, String description, long min, long max) {
        ObjectNode node = integer(mapper, description);
        node.put("minimum", min);
        node.put("maximum", max);
        return node;
    }

    private static ObjectNode array(ObjectMapper mapper, JsonNode items) {
        return array(mapper, items, 100);
    }

    private static ObjectNode array(ObjectMapper mapper, JsonNode items, int maxItems) {
        ObjectNode node = mapper.createObjectNode();
        node.put("type", "array");
        node.set("items", items);
        node.put("maxItems", maxItems);
        return node;
    }

    private static ObjectNode trueOnly(ObjectMapper mapper) {
        ObjectNode node = mapper.createObjectNode();
        node.put("type", "boolean");
        node.set("enum", mapper.createArrayNode().add(true));
        return node;
    }

    private static ArrayNode strings(ObjectMapper mapper, String... values) {
        ArrayNode node = mapper.createArrayNode();
        for (String value : values) {
            node.add(value);
        }
        return node;
    }
}
