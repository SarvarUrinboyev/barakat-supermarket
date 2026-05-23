package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.barakat.market.domain.Payment;
import uz.barakat.market.domain.PaymentCategory;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByDateBetweenOrderByDateDescIdDesc(LocalDate from, LocalDate to);

    /**
     * Distinct non-blank party names for a given category, newest usage
     * first. Powers the supplier / worker autocomplete in the payment
     * modal — same UX as the customer autocomplete but sourced from
     * whatever the user has actually typed before.
     */
    @Query("""
            SELECT p.party FROM Payment p
            WHERE p.category = :category
              AND p.party IS NOT NULL
              AND TRIM(p.party) <> ''
            GROUP BY p.party
            ORDER BY MAX(p.id) DESC
            """)
    List<String> findDistinctParties(@Param("category") PaymentCategory category);
}
