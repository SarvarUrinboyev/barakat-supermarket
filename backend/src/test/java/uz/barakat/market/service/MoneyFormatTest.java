package uz.barakat.market.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** Unit tests for US-dollar money formatting. */
class MoneyFormatTest {

    @Test
    void groupsThousandsWithSpaces() {
        assertEquals("1 234", MoneyFormat.grouped(new BigDecimal("1234")));
    }

    @Test
    void formatsSmallNumberWithoutGrouping() {
        assertEquals("500", MoneyFormat.grouped(new BigDecimal("500")));
    }

    @Test
    void dropsTrailingZeroCents() {
        assertEquals("899", MoneyFormat.grouped(new BigDecimal("899.00")));
    }

    @Test
    void keepsCentsWhenPresent() {
        assertEquals("12.50", MoneyFormat.grouped(new BigDecimal("12.50")));
    }

    @Test
    void usdAddsDollarPrefix() {
        assertEquals("$1 200", MoneyFormat.usd(new BigDecimal("1200")));
    }

    @Test
    void treatsNullAsZero() {
        assertEquals("0", MoneyFormat.grouped(null));
    }
}
