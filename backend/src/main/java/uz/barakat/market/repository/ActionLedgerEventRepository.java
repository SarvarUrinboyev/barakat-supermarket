package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.ActionLedgerEvent;

public interface ActionLedgerEventRepository extends JpaRepository<ActionLedgerEvent, Long> {

    List<ActionLedgerEvent> findAllByOrderByIdDesc();
}
