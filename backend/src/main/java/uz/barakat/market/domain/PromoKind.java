package uz.barakat.market.domain;

/** How a promo campaign computes its discount. */
public enum PromoKind {
    /** Flat percent off the whole sale, e.g. "Bayram -15%". */
    PERCENT_OFF,
    /** Flat UZS amount off, gated on min_subtotal_uzs. */
    AMOUNT_OFF,
    /** Buy N units of a product, get M free. Requires productId + buyQty/getQty. */
    BOGO
}
