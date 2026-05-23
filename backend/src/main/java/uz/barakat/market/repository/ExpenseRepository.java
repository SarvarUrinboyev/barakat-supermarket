package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByDateOrderByIdDesc(LocalDate date);

    List<Expense> findByDateBetweenOrderByDateDescIdDesc(LocalDate from, LocalDate to);
}
