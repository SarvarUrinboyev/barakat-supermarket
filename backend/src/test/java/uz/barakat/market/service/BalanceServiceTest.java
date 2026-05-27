package uz.barakat.market.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import uz.barakat.market.domain.DayBalance;
import uz.barakat.market.dto.BalanceRequest;
import uz.barakat.market.dto.BalanceResponse;
import uz.barakat.market.repository.DayBalanceRepository;

/** Unit tests for the morning cash balance lookup and upsert. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BalanceServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 5, 27);

    @Mock private DayBalanceRepository balances;
    @InjectMocks private BalanceService service;

    private MockedStatic<LocalDate> dateMock;

    @BeforeEach
    void freezeClock() {
        dateMock = mockStatic(LocalDate.class, Mockito.CALLS_REAL_METHODS);
        dateMock.when(LocalDate::now).thenReturn(TODAY);
        when(balances.save(any(DayBalance.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void releaseClock() {
        dateMock.close();
    }

    private static void assertAmount(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual),
                "expected " + expected + " but was " + actual);
    }

    private static DayBalance existingBalance(LocalDate date, String startingCash) {
        DayBalance b = new DayBalance();
        b.setDate(date);
        b.setStartingCash(new BigDecimal(startingCash));
        return b;
    }

    // ---------- forDate ----------

    @Test
    void forDateReturnsZeroWhenNoBalanceRecorded() {
        LocalDate query = LocalDate.of(2026, 5, 20);
        when(balances.findByDate(query)).thenReturn(Optional.empty());

        BalanceResponse response = service.forDate(query);

        assertEquals(query, response.date());
        assertAmount("0", response.startingCash());
    }

    @Test
    void forDateReturnsRecordedStartingCash() {
        LocalDate query = LocalDate.of(2026, 5, 20);
        when(balances.findByDate(query)).thenReturn(Optional.of(existingBalance(query, "1500")));

        BalanceResponse response = service.forDate(query);

        assertAmount("1500", response.startingCash());
    }

    @Test
    void forDateUsesGivenDateNotToday() {
        LocalDate query = LocalDate.of(2026, 4, 10);
        when(balances.findByDate(query)).thenReturn(Optional.empty());

        BalanceResponse response = service.forDate(query);

        assertEquals(query, response.date());
        verify(balances).findByDate(query);
    }

    // ---------- today ----------

    @Test
    void todayQueriesByFrozenTodayAndPropagatesIt() {
        when(balances.findByDate(TODAY)).thenReturn(Optional.of(existingBalance(TODAY, "900")));

        BalanceResponse response = service.today();

        assertEquals(TODAY, response.date());
        assertAmount("900", response.startingCash());
        verify(balances).findByDate(TODAY);
    }

    // ---------- startingCash ----------

    @Test
    void startingCashReturnsZeroWhenNoBalanceRecorded() {
        LocalDate query = LocalDate.of(2026, 5, 20);
        when(balances.findByDate(query)).thenReturn(Optional.empty());

        BigDecimal result = service.startingCash(query);

        assertAmount("0", result);
    }

    @Test
    void startingCashReturnsRecordedAmountWhenPresent() {
        LocalDate query = LocalDate.of(2026, 5, 20);
        when(balances.findByDate(query)).thenReturn(Optional.of(existingBalance(query, "750")));

        BigDecimal result = service.startingCash(query);

        assertAmount("750", result);
    }

    // ---------- set ----------

    @Test
    void setCreatesNewBalanceWhenNoneExistsForDate() {
        LocalDate date = LocalDate.of(2026, 6, 1);
        when(balances.findByDate(date)).thenReturn(Optional.empty());
        BalanceRequest req = new BalanceRequest(new BigDecimal("1200"), date);

        BalanceResponse response = service.set(req);

        ArgumentCaptor<DayBalance> captor = ArgumentCaptor.forClass(DayBalance.class);
        verify(balances).save(captor.capture());
        DayBalance saved = captor.getValue();
        assertEquals(date, saved.getDate());
        assertAmount("1200", saved.getStartingCash());
        assertEquals(date, response.date());
        assertAmount("1200", response.startingCash());
    }

    @Test
    void setUpdatesExistingBalanceWithoutReplacingEntity() {
        LocalDate date = LocalDate.of(2026, 5, 15);
        DayBalance existing = existingBalance(date, "300");
        when(balances.findByDate(date)).thenReturn(Optional.of(existing));
        BalanceRequest req = new BalanceRequest(new BigDecimal("850"), date);

        service.set(req);

        ArgumentCaptor<DayBalance> captor = ArgumentCaptor.forClass(DayBalance.class);
        verify(balances).save(captor.capture());
        assertSame(existing, captor.getValue());
        assertEquals(date, captor.getValue().getDate());
        assertAmount("850", captor.getValue().getStartingCash());
    }

    @Test
    void setDefaultsDateToTodayWhenRequestDateNull() {
        when(balances.findByDate(TODAY)).thenReturn(Optional.empty());
        BalanceRequest req = new BalanceRequest(new BigDecimal("500"), null);

        service.set(req);

        ArgumentCaptor<DayBalance> captor = ArgumentCaptor.forClass(DayBalance.class);
        verify(balances).save(captor.capture());
        assertEquals(TODAY, captor.getValue().getDate());
    }

    @Test
    void setAcceptsZeroStartingCash() {
        when(balances.findByDate(TODAY)).thenReturn(Optional.empty());
        BalanceRequest req = new BalanceRequest(BigDecimal.ZERO, TODAY);

        BalanceResponse response = service.set(req);

        ArgumentCaptor<DayBalance> captor = ArgumentCaptor.forClass(DayBalance.class);
        verify(balances).save(captor.capture());
        assertAmount("0", captor.getValue().getStartingCash());
        assertAmount("0", response.startingCash());
    }
}
