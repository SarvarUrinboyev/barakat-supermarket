package uz.barakat.market.service;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;

/** Formats US-dollar amounts: thousands grouped with spaces, cents when present. */
public final class MoneyFormat {

    private MoneyFormat() {
    }

    private static final ThreadLocal<DecimalFormat> FORMAT = ThreadLocal.withInitial(() -> {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setGroupingSeparator(' ');
        symbols.setDecimalSeparator('.');
        return new DecimalFormat("#,##0.00", symbols);
    });

    /** e.g. {@code 1234} -> {@code "1 234"}, {@code 12.5} -> {@code "12.50"}. */
    public static String grouped(BigDecimal value) {
        String text = FORMAT.get().format(value == null ? BigDecimal.ZERO : value);
        return text.endsWith(".00") ? text.substring(0, text.length() - 3) : text;
    }

    /** e.g. {@code 1234} -> {@code "$1 234"}. */
    public static String usd(BigDecimal value) {
        return "$" + grouped(value);
    }

    /** e.g. {@code 500000} -> {@code "500 000 so'm"} (grouped, no decimals). */
    public static String uzs(BigDecimal value) {
        BigDecimal rounded = (value == null ? BigDecimal.ZERO : value)
                .setScale(0, java.math.RoundingMode.HALF_UP);
        return grouped(rounded) + " so'm";
    }
}
