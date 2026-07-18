package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.repository.Repository;
import uz.barakat.market.domain.ActionLedgerEvent;

/** Deliberately omits delete/update-specific repository operations: the ledger is append-only. */
public interface ActionLedgerEventRepository extends Repository<ActionLedgerEvent, Long> {

    <S extends ActionLedgerEvent> S save(S entity);

    List<ActionLedgerEvent> findAllByOrderByIdDesc();
}
