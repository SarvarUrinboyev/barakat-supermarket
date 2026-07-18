package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.service.savdograph.EvidenceContentHasher;

/** Every calculation-defining EvidenceItem field must participate in its hash. */
class EvidenceContentHasherTest {

    @Test
    void canonicalHashChangesForEveryBusinessSignificantEvidenceField() {
        EvidenceItem baseline = evidence();
        baseline.setContentHash(EvidenceContentHasher.hash(baseline));
        assertThat(EvidenceContentHasher.isCanonicalAndValid(baseline)).isTrue();

        assertChanged(baseline, item -> item.setShopId(2L));
        assertChanged(baseline, item -> item.setAnalysisRunId(11L));
        assertChanged(baseline, item -> item.setProductId(12L));
        assertChanged(baseline, item -> item.setEvidenceType(null));
        assertChanged(baseline, item -> item.setSourceType("OTHER_SOURCE"));
        assertChanged(baseline, item -> item.setPeriodFrom(LocalDate.of(2026, 7, 2)));
        assertChanged(baseline, item -> item.setPeriodTo(LocalDate.of(2026, 7, 19)));
        assertChanged(baseline, item -> item.setCalculationId("OTHER_CALC"));
        assertChanged(baseline, item -> item.setCalculationVersion("B1.2"));
        assertChanged(baseline, item -> item.setInputData("{\"currentQuantity\":3}"));
        assertChanged(baseline, item -> item.setCalculatedResult(BigDecimal.valueOf(9)));
        assertChanged(baseline, item -> item.setUnit("kg"));
        assertChanged(baseline, item -> item.setCurrency(Currency.USD));
    }

    private static void assertChanged(EvidenceItem baseline,
                                      java.util.function.Consumer<EvidenceItem> mutation) {
        EvidenceItem changed = evidence();
        changed.setContentHash(baseline.getContentHash());
        mutation.accept(changed);
        assertThat(EvidenceContentHasher.isCanonicalAndValid(changed)).isFalse();
        assertThat(EvidenceContentHasher.hash(changed)).isNotEqualTo(baseline.getContentHash());
    }

    private static EvidenceItem evidence() {
        EvidenceItem item = new EvidenceItem();
        item.setShopId(1L);
        item.setAnalysisRunId(10L);
        item.setProductId(11L);
        item.setEvidenceType(EvidenceType.REORDER_QUANTITY);
        item.setSourceType("PRODUCT_STOCK");
        item.setPeriodFrom(LocalDate.of(2026, 7, 1));
        item.setPeriodTo(LocalDate.of(2026, 7, 18));
        item.setCalculationId("LOW_STOCK_THRESHOLD_REORDER");
        item.setCalculationVersion("B1");
        item.setInputData("{\"currentQuantity\":2,\"lowStockThreshold\":10}");
        item.setCalculatedResult(new BigDecimal("8.0000"));
        item.setUnit("dona");
        item.setCurrency(Currency.UZS);
        item.setHashVersion(EvidenceContentHasher.HASH_VERSION);
        return item;
    }
}
