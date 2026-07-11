package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * API view of a customer. The balance is reported PER CURRENCY
 * ({@code balanceUzs}, {@code balanceUsd}) and never merged: a positive bucket
 * means the customer owes the shop in that currency, a negative bucket is credit
 * the shop holds (Gate C Q3). There is deliberately NO cross-currency total
 * field — a merged goods/paid sum would re-introduce the exact figure the
 * per-currency balance replaced. Per-currency running totals, where needed, are
 * computed from the ledger lines on the detail view.
 */
public record CustomerResponse(
        Long id,
        String name,
        String phone,
        String address,
        String note,
        BigDecimal balanceUzs,
        BigDecimal balanceUsd,
        int transactionCount,
        LocalDateTime createdAt,
        long pointsBalance,
        long pointsTotalEarned,
        LocalDate birthday,
        String tier,
        int tierDiscountPercent,
        boolean birthdayThisMonth,
        /** True when the customer has linked the self-service Telegram bot. */
        boolean telegramLinked) {
}
