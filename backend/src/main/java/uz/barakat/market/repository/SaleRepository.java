package uz.barakat.market.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.barakat.market.domain.Sale;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    /** Recent sales (newest first), capped at the page size. */
    List<Sale> findTop100ByOrderByCreatedAtDesc();

    /** Sales window — used by Reports and end-of-day. */
    List<Sale> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to);

    /**
     * Single-shot summary of a window: (count, sumTotal, sumRefunded).
     * Cheap enough to call multiple times per request — backs the AI
     * snapshot which now bundles today/yesterday/week/month totals.
     */
    @Query("SELECT COUNT(s), COALESCE(SUM(s.totalUzs), 0), COALESCE(SUM(s.refundedTotalUzs), 0) "
            + "FROM Sale s WHERE s.createdAt >= :from AND s.createdAt < :to")
    Object[] summaryBetween(@Param("from") LocalDateTime from,
                            @Param("to") LocalDateTime to);
}
