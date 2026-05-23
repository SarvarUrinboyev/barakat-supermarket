package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.ManagementCost;

public interface ManagementCostRepository extends JpaRepository<ManagementCost, Long> {

    List<ManagementCost> findByDateBetweenOrderByDateDescIdDesc(LocalDate from, LocalDate to);
}
