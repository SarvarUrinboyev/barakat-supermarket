package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

/** Immutable input/version snapshot for a server-side SavdoGraph calculation. */
@Filter(name = "tenantFilter", condition = "shop_id = :shopId")
@Filter(name = "accountFilter", condition = "shop_id IN (:shopIds)")
@Entity
@Table(name = "savdograph_analysis_run")
@Getter
@Setter
public class AnalysisRun extends TenantScopedEntity {

    @Column(name = "analysis_type", nullable = false, length = 64)
    private String analysisType;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AnalysisRunStatus status;

    @Column(name = "initiated_by", nullable = false, length = 80)
    private String initiatedBy;

    @Column(name = "tool_version", nullable = false, length = 80)
    private String toolVersion;

    @Column(name = "input_snapshot", nullable = false, columnDefinition = "TEXT")
    private String inputSnapshot;

    @Column(name = "input_hash", nullable = false, length = 64)
    private String inputHash;
}
