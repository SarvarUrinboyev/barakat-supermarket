package uz.barakat.market.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.StockMovement;
import uz.barakat.market.domain.StockReason;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /** The 20 most recent movements for a product, newest first. */
    List<StockMovement> findTop20ByProductIdOrderByIdDesc(Long productId);

    /** Movements with the given reason inside a timestamp window (Management sales). */
    List<StockMovement> findByReasonAndCreatedAtBetween(
            StockReason reason, LocalDateTime from, LocalDateTime to);
}
