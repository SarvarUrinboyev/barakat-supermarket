package uz.barakat.market.service.savdograph;

import java.util.Collection;
import org.springframework.stereotype.Component;
import uz.barakat.market.domain.EvidenceItem;

/** Maps immutable evidence to the allow-listed provider DTO without making a provider call. */
@Component
public class ProviderExplanationPayloadMapper {

    public ProviderExplanationPayload fromEvidence(Collection<EvidenceItem> items) {
        return new ProviderExplanationPayload("savdograph-b1", items.stream()
                .map(item -> new ProviderExplanationPayload.Evidence(
                        item.getId(), item.getEvidenceType(), item.getCalculationId(),
                        item.getCalculationVersion(), item.getPeriodFrom(), item.getPeriodTo(),
                        item.getCalculatedResult(), item.getUnit(), item.getCurrency(), item.getContentHash()))
                .toList());
    }
}
