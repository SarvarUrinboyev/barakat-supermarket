package uz.barakat.market.domain;

/** Kind of row in a debt's history. */
public enum DebtEntryType {
    /** Money paid towards the debt. */
    PAYMENT,
    /** Extra amount added to the debt ("+ Qo'sh"). */
    INCREASE
}
