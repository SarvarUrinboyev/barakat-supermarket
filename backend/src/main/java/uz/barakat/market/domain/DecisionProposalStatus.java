package uz.barakat.market.domain;

/** Server-enforced lifecycle for a human-reviewed SavdoGraph proposal. */
public enum DecisionProposalStatus {
    PROPOSED,
    REJECTED,
    DRAFT_CREATED
}
