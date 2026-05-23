package uz.barakat.market.domain;

/** Which way money moved in a payment-journal entry. */
public enum PaymentDirection {
    /** Money received by the shop ("Kirim"). */
    INCOMING,
    /** Money paid out by the shop ("Chiqim"). */
    OUTGOING
}
