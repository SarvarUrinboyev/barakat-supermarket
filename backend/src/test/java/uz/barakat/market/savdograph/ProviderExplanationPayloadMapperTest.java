package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.service.savdograph.ProviderExplanationPayloadMapper;

/** The future provider boundary is an allow-list, not a sanitized domain dump. */
class ProviderExplanationPayloadMapperTest {

    @Test
    void excludesContactIdentityPaymentCredentialAndTenantFields() throws Exception {
        EvidenceItem item = new EvidenceItem();
        item.setId(42L);
        item.setShopId(9001L);
        item.setProductId(501L);
        item.setEvidenceType(EvidenceType.REORDER_QUANTITY);
        item.setCalculationId("LOW_STOCK_THRESHOLD_REORDER");
        item.setCalculationVersion("B1");
        item.setPeriodFrom(LocalDate.of(2026, 7, 1));
        item.setPeriodTo(LocalDate.of(2026, 7, 18));
        item.setCalculatedResult(BigDecimal.valueOf(8));
        item.setUnit("dona");
        item.setCurrency(Currency.UZS);
        item.setContentHash("a".repeat(64));

        String payload = new ObjectMapper().findAndRegisterModules().writeValueAsString(
                new ProviderExplanationPayloadMapper().fromEvidence(List.of(item)));

        assertThat(payload).contains("calculatedResult", "contentHash", "evidenceId");
        assertThat(payload).doesNotContain("shopId", "tenant", "productId", "customer", "employee",
                "supplier", "phone", "email", "address", "credential", "token", "password", "payment",
                "sourceType", "inputData");
    }
}
