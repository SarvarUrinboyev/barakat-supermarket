package uz.barakat.market.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.TerminalBalance;
import uz.barakat.market.dto.TerminalRequest;
import uz.barakat.market.dto.TerminalResponse;
import uz.barakat.market.repository.TerminalBalanceRepository;

/** Daily Humo / UzCard card-terminal totals. */
@Service
@Transactional
public class TerminalService {

    private final TerminalBalanceRepository terminals;

    public TerminalService(TerminalBalanceRepository terminals) {
        this.terminals = terminals;
    }

    @Transactional(readOnly = true)
    public TerminalResponse forDate(LocalDate date) {
        return terminals.findByDate(date)
                .map(t -> Mappers.terminal(t.getDate(), t.getHumoAmount(), t.getUzcardAmount()))
                .orElse(Mappers.terminal(date, BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Transactional(readOnly = true)
    public TerminalResponse today() {
        return forDate(LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<TerminalResponse> recent() {
        return terminals.findAll(Sort.by(Sort.Direction.DESC, "date")).stream()
                .map(t -> Mappers.terminal(t.getDate(), t.getHumoAmount(), t.getUzcardAmount()))
                .toList();
    }

    /** Creates or updates the terminal totals for a date. */
    public TerminalResponse save(TerminalRequest request) {
        LocalDate date = request.date() != null ? request.date() : LocalDate.now();
        TerminalBalance balance = terminals.findByDate(date).orElseGet(() -> {
            TerminalBalance fresh = new TerminalBalance();
            fresh.setDate(date);
            return fresh;
        });
        balance.setHumoAmount(request.humoAmount());
        balance.setUzcardAmount(request.uzcardAmount());
        terminals.save(balance);
        return Mappers.terminal(balance.getDate(), balance.getHumoAmount(),
                balance.getUzcardAmount());
    }
}
