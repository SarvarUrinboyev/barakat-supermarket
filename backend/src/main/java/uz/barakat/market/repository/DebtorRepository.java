package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.Debtor;

public interface DebtorRepository extends JpaRepository<Debtor, Long> {

    /** Unpaid debts first, most recent first. */
    List<Debtor> findAllByOrderByPaidAscDateDescIdDesc();

    List<Debtor> findByPaidFalse();
}
