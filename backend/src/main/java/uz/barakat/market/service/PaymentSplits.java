package uz.barakat.market.service;

import java.math.BigDecimal;
import uz.barakat.market.domain.PaymentType;
import uz.barakat.market.exception.BadRequestException;

/** Derives how an expense amount is split across KASSA / NAQD / KARTA. */
final class PaymentSplits {

    private PaymentSplits() {
    }

    /** The three buckets an amount can be paid from. */
    record Split(BigDecimal cash, BigDecimal naqd, BigDecimal card) {
    }

    /**
     * For a single-method payment the whole amount lands in one bucket;
     * for {@link PaymentType#ARALASH} the caller-supplied parts are used
     * and must sum to {@code amount}; for {@link PaymentType#QARZGA}
     * nothing moves (the expense becomes a debt instead).
     */
    static Split resolve(PaymentType type, BigDecimal amount,
                         BigDecimal cash, BigDecimal naqd, BigDecimal card) {
        BigDecimal zero = BigDecimal.ZERO;
        return switch (type) {
            case NAQD -> new Split(zero, amount, zero);
            case KASSA -> new Split(amount, zero, zero);
            // KARTA, P2P (card-to-card), TRANSFER (bank wire) all settle through
            // the card / bank bucket — none of them touches physical cash.
            case KARTA, P2P, TRANSFER -> new Split(zero, zero, amount);
            case QARZGA -> new Split(zero, zero, zero);
            case ARALASH -> {
                BigDecimal c = nz(cash);
                BigDecimal n = nz(naqd);
                BigDecimal k = nz(card);
                BigDecimal sum = c.add(n).add(k);
                if (sum.compareTo(amount) != 0) {
                    throw new BadRequestException(
                            "Aralash to'lov bo'laklari yig'indisi (" + MoneyFormat.grouped(sum)
                                    + ") umumiy summaga (" + MoneyFormat.grouped(amount)
                                    + ") teng emas");
                }
                yield new Split(c, n, k);
            }
        };
    }

    static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
