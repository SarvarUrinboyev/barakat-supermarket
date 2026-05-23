package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** The Payment-journal page payload: the entries plus in / out totals. */
public record PaymentSummary(
        LocalDate from,
        LocalDate to,
        BigDecimal incomingTotal,
        BigDecimal outgoingTotal,
        BigDecimal net,
        List<PaymentResponse> payments) {
}
