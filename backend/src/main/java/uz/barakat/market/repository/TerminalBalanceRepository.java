package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.TerminalBalance;

public interface TerminalBalanceRepository extends JpaRepository<TerminalBalance, Long> {

    Optional<TerminalBalance> findByDate(LocalDate date);
}
