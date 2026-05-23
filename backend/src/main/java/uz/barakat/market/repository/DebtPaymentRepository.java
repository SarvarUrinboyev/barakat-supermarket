package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.DebtPayment;

public interface DebtPaymentRepository extends JpaRepository<DebtPayment, Long> {

    List<DebtPayment> findByDebtorIdOrderByPaymentDateDescIdDesc(Long debtorId);

    List<DebtPayment> findByCustomerDebtIdOrderByPaymentDateDescIdDesc(Long customerDebtId);
}
