package uz.barakat.market.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.Order;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** Orders due exactly on the given date and not yet received. */
    List<Order> findByCompletedFalseAndDeliveryDateOrderByIdDesc(LocalDate deliveryDate);

    /** Overdue: due before the given date and not yet received. */
    List<Order> findByCompletedFalseAndDeliveryDateLessThanOrderByDeliveryDateAsc(LocalDate deliveryDate);

    /** Upcoming: due after the given date and not yet received. */
    List<Order> findByCompletedFalseAndDeliveryDateGreaterThanOrderByDeliveryDateAsc(LocalDate deliveryDate);

    List<Order> findAllByOrderByCompletedAscDeliveryDateAscIdDesc();
}
