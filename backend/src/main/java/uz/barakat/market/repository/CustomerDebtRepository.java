package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.CustomerDebt;

public interface CustomerDebtRepository extends JpaRepository<CustomerDebt, Long> {

    /** Unpaid debts first, most recent first. */
    List<CustomerDebt> findAllByOrderByPaidAscDateDescIdDesc();

    List<CustomerDebt> findByPaidFalse();
}
