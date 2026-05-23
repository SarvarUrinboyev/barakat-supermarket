package uz.barakat.market.domain;

/** Why a product's stock quantity changed. */
public enum StockReason {
    /** Opening balance set when the product was created. */
    INITIAL,
    /** New goods delivered by a supplier. */
    DELIVERY,
    /** Sold to a customer. */
    SALE,
    /** Returned goods added back to stock. */
    RETURN,
    /** Manual count / correction. */
    CORRECTION,
    /** Written off - defective or lost. */
    WRITEOFF
}
