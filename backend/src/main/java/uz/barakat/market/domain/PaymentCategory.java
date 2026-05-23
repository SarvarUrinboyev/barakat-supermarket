package uz.barakat.market.domain;

/** What a payment-journal entry was for. */
public enum PaymentCategory {
    /** A customer paid the shop. */
    CUSTOMER,
    /** The shop paid a supplier. */
    SUPPLIER,
    /** A worker's wage was paid. */
    SALARY,
    /** A tax payment. */
    TAX,
    /** Anything else. */
    OTHER
}
