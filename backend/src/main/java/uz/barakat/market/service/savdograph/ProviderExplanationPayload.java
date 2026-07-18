package uz.barakat.market.service.savdograph;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceType;

/**
 * Deliberately minimal future-provider contract. It contains retail aggregates
 * only and has no customer, employee, supplier, contact, payment, credential,
 * address, free-text, tenant, or shop fields.
 */
public record ProviderExplanationPayload(
        String schemaVersion,
        List<Evidence> evidence) {

    public record Evidence(
            Long evidenceId,
            EvidenceType evidenceType,
            String calculationId,
            String calculationVersion,
            LocalDate periodFrom,
            LocalDate periodTo,
            BigDecimal calculatedResult,
            String unit,
            Currency currency,
            String contentHash) {
    }
}
