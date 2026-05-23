package uz.barakat.market.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.DayBalance;
import uz.barakat.market.dto.BalanceRequest;
import uz.barakat.market.dto.BalanceResponse;
import uz.barakat.market.repository.DayBalanceRepository;

/** The morning cash balance per date ("Ertalabgi balans"). */
@Service
@Transactional
public class BalanceService {

    private final DayBalanceRepository balances;

    public BalanceService(DayBalanceRepository balances) {
        this.balances = balances;
    }

    @Transactional(readOnly = true)
    public BalanceResponse forDate(LocalDate date) {
        return new BalanceResponse(date, startingCash(date));
    }

    @Transactional(readOnly = true)
    public BalanceResponse today() {
        return forDate(LocalDate.now());
    }

    /** Morning cash for a date, or zero when none was recorded. */
    @Transactional(readOnly = true)
    public BigDecimal startingCash(LocalDate date) {
        return balances.findByDate(date)
                .map(DayBalance::getStartingCash)
                .orElse(BigDecimal.ZERO);
    }

    /** Creates or updates the morning balance for a date. */
    public BalanceResponse set(BalanceRequest request) {
        LocalDate date = request.date() != null ? request.date() : LocalDate.now();
        DayBalance balance = balances.findByDate(date).orElseGet(() -> {
            DayBalance fresh = new DayBalance();
            fresh.setDate(date);
            return fresh;
        });
        balance.setStartingCash(request.startingCash());
        balances.save(balance);
        return new BalanceResponse(balance.getDate(), balance.getStartingCash());
    }
}
