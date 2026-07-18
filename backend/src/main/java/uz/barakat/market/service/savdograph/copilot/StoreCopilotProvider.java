package uz.barakat.market.service.savdograph.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

/** One bounded turn against a structured, tool-capable language provider. */
public interface StoreCopilotProvider {

    boolean isAvailable();

    String model();

    ProviderTurn exchange(ProviderRequest request);

    record ProviderRequest(
            String instructions,
            JsonNode input,
            JsonNode tools,
            JsonNode responseFormat,
            String safetyIdentifier) {
    }

    record ToolCall(String callId, String name, JsonNode arguments) {
    }

    record ProviderTurn(
            String responseId,
            String model,
            List<ToolCall> toolCalls,
            JsonNode structuredOutput,
            JsonNode continuationItems,
            boolean refused,
            long latencyMs) {
    }
}
