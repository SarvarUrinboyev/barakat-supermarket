package uz.barakat.market.dto;

import java.math.BigDecimal;
import uz.barakat.market.domain.PaymentType;

/** One parsed line from a bulk-import text, shown in the preview. */
public record ParsedLine(
        int lineNumber,
        String raw,
        String name,
        BigDecimal amount,
        PaymentType paymentType,
        BigDecimal cashAmount,
        BigDecimal naqdAmount,
        BigDecimal cardAmount,
        boolean valid,
        String error) {
}
