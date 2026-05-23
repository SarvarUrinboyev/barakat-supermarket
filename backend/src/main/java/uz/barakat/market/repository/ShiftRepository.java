package uz.barakat.market.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.Shift;
import uz.barakat.market.domain.ShiftStatus;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    Optional<Shift> findFirstByStatusOrderByOpenedAtDesc(ShiftStatus status);

    List<Shift> findAllByOrderByOpenedAtDesc();
}
