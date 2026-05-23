package uz.barakat.market.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import uz.barakat.market.domain.PaymentType;
import uz.barakat.market.dto.BulkParseResult;
import uz.barakat.market.dto.ParsedLine;

/**
 * Parses the owner's "old notebook" expense text into structured lines.
 *
 * <p>Recognised shape (one expense per line):
 * <pre>
 *   [N)] NAME AMOUNT [ming|mln] [PAYMENT]
 * </pre>
 * where PAYMENT is empty / "berildi" (defaults to NAQD), a single keyword
 * ("kassadan", "kartadan", "naqd", "qarz"), or a split such as
 * "614 kassadan+250 kartadan". A leading line like {@code 25.03.2026}
 * (optionally wrapped in {@code *}) sets the date for the whole block.
 */
@Component
public class BulkImportParser {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private static final Pattern INDEX_PREFIX = Pattern.compile("^\\s*\\d{1,4}\\s*[).:\\-]\\s*");
    private static final Pattern DATE_LINE =
            Pattern.compile("^(\\d{1,2})[.\\-/](\\d{1,2})[.\\-/](\\d{4})$");
    private static final Pattern FIRST_NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)?");
    private static final Pattern NUMBER_WORD = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*([\\p{L}']+)");

    /** Parse the whole block; {@code fallbackDate} is used when no date line is present. */
    public BulkParseResult parse(String text, LocalDate fallbackDate) {
        LocalDate date = fallbackDate != null ? fallbackDate : LocalDate.now();
        List<ParsedLine> lines = new ArrayList<>();
        int valid = 0;
        int invalid = 0;
        int seq = 0;

        for (String rawLine : (text == null ? "" : text).split("\\r?\\n")) {
            String line = rawLine.strip();
            if (line.isEmpty()) {
                continue;
            }
            LocalDate maybeDate = tryDate(line);
            if (maybeDate != null) {
                date = maybeDate;
                continue;
            }
            seq++;
            ParsedLine parsed = parseEntry(seq, line);
            if (parsed.valid()) {
                valid++;
            } else {
                invalid++;
            }
            lines.add(parsed);
        }
        return new BulkParseResult(date, valid, invalid, lines);
    }

    private LocalDate tryDate(String line) {
        String cleaned = line.replace("*", "").strip();
        Matcher m = DATE_LINE.matcher(cleaned);
        if (!m.matches()) {
            return null;
        }
        try {
            return LocalDate.of(
                    Integer.parseInt(m.group(3)),
                    Integer.parseInt(m.group(2)),
                    Integer.parseInt(m.group(1)));
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private ParsedLine parseEntry(int seq, String raw) {
        String body = INDEX_PREFIX.matcher(raw).replaceFirst("");
        String lower = body.toLowerCase();

        long factor = 1;
        if (lower.contains("mln") || lower.contains("million")) {
            factor = 1_000_000;
        } else if (lower.contains("ming")) {
            factor = 1_000;
        }
        String clean = body.replaceAll("(?i)\\b(ming|mln|million)\\b", " ")
                .replaceAll("\\s+", " ").strip();

        Matcher firstNumber = FIRST_NUMBER.matcher(clean);
        if (!firstNumber.find()) {
            return invalid(seq, raw, "Summa topilmadi");
        }
        String name = clean.substring(0, firstNumber.start()).strip();
        if (name.isEmpty()) {
            name = "(nomsiz)";
        }
        String rest = clean.substring(firstNumber.start()).strip();

        Matcher totalMatcher = FIRST_NUMBER.matcher(rest);
        totalMatcher.find();
        BigDecimal total = number(totalMatcher.group()).multiply(BigDecimal.valueOf(factor));
        if (total.signum() <= 0) {
            return invalid(seq, raw, "Summa noldan katta bo'lishi kerak");
        }
        String paymentPart = rest.substring(totalMatcher.end()).strip();
        String paymentLower = paymentPart.toLowerCase();

        if (paymentLower.contains("qarz")) {
            return new ParsedLine(seq, raw, name, total, PaymentType.QARZGA, ZERO, ZERO, ZERO,
                    true, null);
        }

        BigDecimal cash = ZERO;
        BigDecimal naqd = ZERO;
        BigDecimal card = ZERO;
        boolean splitFound = false;
        Matcher pairs = NUMBER_WORD.matcher(paymentPart);
        while (pairs.find()) {
            PaymentType method = method(pairs.group(2).toLowerCase());
            if (method == null) {
                continue;
            }
            BigDecimal value = number(pairs.group(1)).multiply(BigDecimal.valueOf(factor));
            splitFound = true;
            switch (method) {
                case KASSA -> cash = cash.add(value);
                case NAQD -> naqd = naqd.add(value);
                case KARTA -> card = card.add(value);
                default -> { /* QARZGA / ARALASH never returned by method() */ }
            }
        }

        if (splitFound) {
            BigDecimal sum = cash.add(naqd).add(card);
            if (sum.compareTo(total) != 0) {
                return invalid(seq, raw, "To'lov bo'laklari (" + MoneyFormat.grouped(sum)
                        + ") umumiy summaga (" + MoneyFormat.grouped(total) + ") teng emas");
            }
            PaymentType type = paymentTypeOf(cash, naqd, card);
            return new ParsedLine(seq, raw, name, total, type, cash, naqd, card, true, null);
        }

        // No numeric split: a bare keyword, or empty / "berildi" -> default NAQD.
        if (paymentLower.contains("kassa")) {
            return new ParsedLine(seq, raw, name, total, PaymentType.KASSA, total, ZERO, ZERO,
                    true, null);
        }
        if (paymentLower.contains("karta") || paymentLower.contains("kart")) {
            return new ParsedLine(seq, raw, name, total, PaymentType.KARTA, ZERO, ZERO, total,
                    true, null);
        }
        return new ParsedLine(seq, raw, name, total, PaymentType.NAQD, ZERO, total, ZERO,
                true, null);
    }

    private static PaymentType paymentTypeOf(BigDecimal cash, BigDecimal naqd, BigDecimal card) {
        int nonZero = (cash.signum() > 0 ? 1 : 0)
                + (naqd.signum() > 0 ? 1 : 0)
                + (card.signum() > 0 ? 1 : 0);
        if (nonZero >= 2) {
            return PaymentType.ARALASH;
        }
        if (cash.signum() > 0) {
            return PaymentType.KASSA;
        }
        return card.signum() > 0 ? PaymentType.KARTA : PaymentType.NAQD;
    }

    private static PaymentType method(String word) {
        if (word.contains("kassa")) {
            return PaymentType.KASSA;
        }
        if (word.contains("karta") || word.contains("kart")) {
            return PaymentType.KARTA;
        }
        if (word.contains("naqd") || word.contains("naqt")) {
            return PaymentType.NAQD;
        }
        return null;
    }

    private static BigDecimal number(String token) {
        return new BigDecimal(token.replace(',', '.'));
    }

    private static ParsedLine invalid(int seq, String raw, String error) {
        return new ParsedLine(seq, raw, null, null, null, null, null, null, false, error);
    }
}
