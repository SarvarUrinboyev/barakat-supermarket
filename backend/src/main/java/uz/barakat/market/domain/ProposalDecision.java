package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.Immutable;

/** One append-only, database-unique decision per SavdoGraph proposal. */
@Filter(name = "tenantFilter", condition = "shop_id = :shopId")
@Filter(name = "accountFilter", condition = "shop_id IN (:shopIds)")
@Immutable
@Entity
@Table(name = "savdograph_proposal_decision")
@Getter
@Setter
public class ProposalDecision extends TenantScopedEntity {

    @Column(name = "proposal_id", nullable = false)
    private Long proposalId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ProposalDecisionType decision;

    @Column(nullable = false, length = 80)
    private String actor;

    @Column(length = 500)
    private String reason;

    @Column(name = "idempotency_key", nullable = false, length = 120)
    private String idempotencyKey;

    @Column(name = "purchase_order_id")
    private Long purchaseOrderId;
}
