package uz.barakat.market.domain;

/**
 * How an expense was paid for.
 *
 * <ul>
 *   <li>{@link #NAQD}     - physical cash (currency tells you USD or UZS)</li>
 *   <li>{@link #KASSA}    - the shop's cash register / till</li>
 *   <li>{@link #KARTA}    - bank card (terminal)</li>
 *   <li>{@link #P2P}      - card-to-card P2P transfer</li>
 *   <li>{@link #TRANSFER} - bank-to-bank wire / perechisleniya</li>
 *   <li>{@link #ARALASH}  - mixed; the amount is split across the above</li>
 *   <li>{@link #QARZGA}   - on credit; also creates a debtor record</li>
 * </ul>
 */
public enum PaymentType {
    NAQD,
    KASSA,
    KARTA,
    P2P,
    TRANSFER,
    ARALASH,
    QARZGA
}
