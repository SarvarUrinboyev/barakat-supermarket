package uz.barakat.market.domain;

/** A line in a customer's ledger. */
public enum CustomerTxType {
    /** Goods handed to the customer - raises what they owe the shop. */
    GOODS,
    /** Money received from the customer - lowers what they owe the shop. */
    PAYMENT
}
