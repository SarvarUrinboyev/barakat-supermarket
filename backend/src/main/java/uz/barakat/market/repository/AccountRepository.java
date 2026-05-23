package uz.barakat.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {
}
