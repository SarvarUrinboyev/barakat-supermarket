package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.DayBalance;

public interface DayBalanceRepository extends JpaRepository<DayBalance, Long> {

    Optional<DayBalance> findByDate(LocalDate date);
}
