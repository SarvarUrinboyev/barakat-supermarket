package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.CustomerTransaction;
import uz.barakat.market.domain.CustomerTxType;

public interface CustomerTransactionRepository
        extends JpaRepository<CustomerTransaction, Long> {

    /** A customer's ledger, newest line first. */
    List<CustomerTransaction> findByCustomerIdOrderByDateDescIdDesc(Long customerId);

    /** Customer transactions of a given type within a date range. */
    List<CustomerTransaction> findByTypeAndDateBetweenOrderByDateDescIdDesc(
            CustomerTxType type, LocalDate from, LocalDate to);
}
