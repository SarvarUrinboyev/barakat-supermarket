package uz.barakat.market.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * API view of a customer with ledger totals. The balance is reported PER
 * CURRENCY ({@code balanceUzs}, {@code balanceUsd}) and never merged: a
 * positive bucket means the customer owes the shop in that currency, a
 * negative bucket is credit the shop holds. {@code goodsTotal}/{@code paidTotal}
 * are informational running totals only — the authoritative debt is the
 * per-currency balance (Gate C Q3).
 */
public record CustomerResponse(
        Long id,
        String name,
        String phone,
        String address,
        String note,
        BigDecimal goodsTotal,
        BigDecimal paidTotal,
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
