package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

/** Tenant-scoped reorder proposal whose quantity is backed by immutable evidence. */
@Filter(name = "tenantFilter", condition = "shop_id = :shopId")
@Filter(name = "accountFilter", condition = "shop_id IN (:shopIds)")
@Entity
@Table(name = "savdograph_decision_proposal")
@Getter
@Setter
public class DecisionProposal extends TenantScopedEntity {

    @Column(name = "analysis_run_id", nullable = false)
    private Long analysisRunId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "proposal_type", nullable = false, length = 32)
    private String proposalType;

    /** Null for legacy B1 proposals; identifies the dedicated server-side bridge when present. */
    @Column(name = "source_kind", length = 32)
    private String sourceKind;

    @Column(name = "proposed_reorder_quantity", nullable = false)
    private int proposedReorderQuantity;

    @Column(name = "expected_impact", nullable = false, columnDefinition = "TEXT")
    private String expectedImpact;

    @Column(name = "risk_summary", nullable = false, columnDefinition = "TEXT")
    private String riskSummary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String assumptions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DecisionProposalStatus status;

    @Column(name = "evidence_hash", nullable = false, length = 64)
    private String evidenceHash;

    @Column(name = "created_by", nullable = false, length = 80)
    private String createdBy;

    @Version
    @Column(nullable = false)
    private Long version;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "savdograph_proposal_evidence",
            joinColumns = @JoinColumn(name = "proposal_id"),
            inverseJoinColumns = @JoinColumn(name = "evidence_id"))
    private List<EvidenceItem> evidenceItems = new ArrayList<>();
}
