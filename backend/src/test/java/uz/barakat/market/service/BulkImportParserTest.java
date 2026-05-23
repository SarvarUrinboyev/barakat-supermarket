package uz.barakat.market.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import uz.barakat.market.domain.PaymentType;
import uz.barakat.market.dto.BulkParseResult;
import uz.barakat.market.dto.ParsedLine;

/** Unit tests for the "old notebook" bulk-import parser. */
class BulkImportParserTest {

    private final BulkImportParser parser = new BulkImportParser();
    private static final LocalDate FALLBACK = LocalDate.of(2026, 1, 1);

    private static void assertAmount(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual),
                "expected " + expected + " but was " + actual);
    }

    @Test
    void parsesPlainCashLine() {
        ParsedLine line = parser.parse("1)Non 24 ming berildi", FALLBACK).lines().get(0);
        assertTrue(line.valid());
        assertEquals("Non", line.name());
        assertAmount("24000", line.amount());
        assertEquals(PaymentType.NAQD, line.paymentType());
        assertAmount("24000", line.naqdAmount());
    }

    @Test
    void parsesKassaLine() {
        ParsedLine line = parser.parse("3)Hydrolife 430 ming kassadan", FALLBACK).lines().get(0);
        assertTrue(line.valid());
        assertEquals("Hydrolife", line.name());
        assertEquals(PaymentType.KASSA, line.paymentType());
        assertAmount("430000", line.cashAmount());
    }

    @Test
    void parsesMixedPaymentLine() {
        ParsedLine line = parser.parse(
                "18)Montella 864 ming 614 kassadan+250 kartadan", FALLBACK).lines().get(0);
        assertTrue(line.valid());
        assertEquals("Montella", line.name());
        assertEquals(PaymentType.ARALASH, line.paymentType());
        assertAmount("864000", line.amount());
        assertAmount("614000", line.cashAmount());
        assertAmount("250000", line.cardAmount());
    }

    @Test
    void rejectsMixedLineWhenPartsDoNotSumToTotal() {
        ParsedLine line = parser.parse(
                "1)Montella 900 ming 614 kassadan+250 kartadan", FALLBACK).lines().get(0);
        assertFalse(line.valid());
    }

    @Test
    void detectsDateHeaderWrappedInStars() {
        BulkParseResult result = parser.parse(
                "****25.03.2026****\n1)Non 24 ming berildi", FALLBACK);
        assertEquals(LocalDate.of(2026, 3, 25), result.date());
        assertEquals(1, result.validCount());
    }

    @Test
    void usesFallbackDateWhenNoHeaderPresent() {
        BulkParseResult result = parser.parse("1)Non 24 ming berildi", FALLBACK);
        assertEquals(FALLBACK, result.date());
    }

    @Test
    void parsesCreditLineAsQarzga() {
        ParsedLine line = parser.parse("2)Sut 100 ming qarzga", FALLBACK).lines().get(0);
        assertTrue(line.valid());
        assertEquals(PaymentType.QARZGA, line.paymentType());
        assertAmount("100000", line.amount());
    }

    @Test
    void flagsLineWithoutAmount() {
        ParsedLine line = parser.parse("just some text", FALLBACK).lines().get(0);
        assertFalse(line.valid());
    }

    @Test
    void countsValidAndInvalidLines() {
        BulkParseResult result = parser.parse(
                "1)Non 24 ming berildi\n2)broken line\n3)Cola 1237 ming kassadan", FALLBACK);
        assertEquals(2, result.validCount());
        assertEquals(1, result.invalidCount());
    }
}
