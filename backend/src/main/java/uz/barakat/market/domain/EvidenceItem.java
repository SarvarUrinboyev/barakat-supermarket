package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.Immutable;

/** A content-addressed, append-only result of a deterministic retail calculation. */
@Filter(name = "tenantFilter", condition = "shop_id = :shopId")
@Filter(name = "accountFilter", condition = "shop_id IN (:shopIds)")
@Immutable
@Entity
@Table(name = "savdograph_evidence_item")
@Getter
@Setter
public class EvidenceItem extends TenantScopedEntity {

    @Column(name = "analysis_run_id", nullable = false)
    private Long analysisRunId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "evidence_type", nullable = false, length = 64)
    private EvidenceType evidenceType;

    @Column(name = "source_type", nullable = false, length = 64)
    private String sourceType;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "calculation_id", nullable = false, length = 96)
    private String calculationId;

    @Column(name = "calculation_version", nullable = false, length = 80)
    private String calculationVersion;

    @Column(name = "input_data", nullable = false, columnDefinition = "TEXT")
    private String inputData;

    @Column(name = "calculated_result", precision = 19, scale = 4)
    private BigDecimal calculatedResult;

    @Column(length = 24)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(length = 3)
    private Currency currency;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    /** Identifies the canonical field set protected by {@link #contentHash}. */
    @Column(name = "hash_version", nullable = false, length = 32)
    private String hashVersion;
}
