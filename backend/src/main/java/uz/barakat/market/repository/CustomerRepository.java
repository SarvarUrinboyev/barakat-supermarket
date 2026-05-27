package uz.barakat.market.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.Customer;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findAllByOrderByNameAsc();

    /** Finds the customer linked to a Telegram chat (self-service bot). */
    Optional<Customer> findByTelegramChatId(Long telegramChatId);

    /** Finds the customer whose loyalty card QR matches the scanned code. */
    Optional<Customer> findByCardCode(String cardCode);
}
