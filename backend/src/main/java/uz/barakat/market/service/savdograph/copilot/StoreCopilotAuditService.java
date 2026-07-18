package uz.barakat.market.service.savdograph.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.ActionLedgerEvent;
import uz.barakat.market.repository.ActionLedgerEventRepository;

/** Appends compact, privacy-safe B3 events to the existing immutable ledger. */
@Service
public class StoreCopilotAuditService {

    private final ActionLedgerEventRepository ledger;
    private final ObjectMapper mapper;
    private final StoreCopilotSafety safety;

    public StoreCopilotAuditService(ActionLedgerEventRepository ledger, ObjectMapper mapper,
                                    StoreCopilotSafety safety) {
        this.ledger = ledger;
        this.mapper = mapper;
        this.safety = safety;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String interactionId, String eventType, String outcome, String model,
                       Collection<String> tools, Collection<Long> evidenceIds, String classification) {
        ActionLedgerEvent event = new ActionLedgerEvent();
        event.setShopId(TenantContext.requireShopId());
        event.setActor(safety.currentSafetyIdentifier());
        event.setEvidenceReferences(json(evidenceIds == null ? List.of() : evidenceIds.stream().sorted().toList()));
        event.setEventType(limitToken(eventType, 64));
        event.setOutcome(limitToken(outcome, 64));
        String safeTools = tools == null ? "" : tools.stream()
                .map(tool -> limitToken(tool, 48)).sorted().collect(Collectors.joining(","));
        event.setDetails(limit("interaction=" + limitToken(interactionId, 48)
                + ";model=" + limitToken(model, 48)
                + ";prompt=" + StoreCopilotInstructions.VERSION
                + ";tools=" + safeTools
                + ";classification=" + limitToken(classification, 32), 500));
        ledger.save(event);
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Copilot audit evidence could not be serialized", ex);
        }
    }

    private static String limitToken(String value, int max) {
        String safe = value == null ? "" : value.replaceAll("[^A-Za-z0-9_.:-]", "_");
        return limit(safe, max);
    }

    private static String limit(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
