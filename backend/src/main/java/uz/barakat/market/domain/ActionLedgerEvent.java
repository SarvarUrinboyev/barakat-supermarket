package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.Immutable;

/** Append-only, privacy-minimal SavdoGraph decision trace. */
@Filter(name = "tenantFilter", condition = "shop_id = :shopId")
@Filter(name = "accountFilter", condition = "shop_id IN (:shopIds)")
@Immutable
@Entity
@Table(name = "savdograph_action_ledger_event")
@Getter
@Setter
public class ActionLedgerEvent extends TenantScopedEntity {

    @Column(name = "proposal_id")
    private Long proposalId;

    @Column(name = "proposal_decision_id")
    private Long proposalDecisionId;

    @Column(nullable = false, length = 80)
    private String actor;

    @Column(name = "evidence_references", nullable = false, columnDefinition = "TEXT")
    private String evidenceReferences;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(nullable = false, length = 64)
    private String outcome;

    @Column(name = "purchase_order_id")
    private Long purchaseOrderId;

    @Column(length = 500)
    private String details;
}
