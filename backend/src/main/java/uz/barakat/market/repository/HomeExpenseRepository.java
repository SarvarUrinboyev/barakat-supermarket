package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.HomeExpense;

public interface HomeExpenseRepository extends JpaRepository<HomeExpense, Long> {

    List<HomeExpense> findByDateOrderByIdDesc(LocalDate date);

    List<HomeExpense> findByDateBetweenOrderByDateDescIdDesc(LocalDate from, LocalDate to);
}
