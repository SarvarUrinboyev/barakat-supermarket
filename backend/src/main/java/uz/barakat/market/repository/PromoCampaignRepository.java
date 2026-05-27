package uz.barakat.market.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.barakat.market.domain.PromoCampaign;

public interface PromoCampaignRepository extends JpaRepository<PromoCampaign, Long> {

    List<PromoCampaign> findAllByOrderByStartsAtDesc();

    /**
     * Currently active campaigns — {@code active=true} AND now is in
     * [startsAt, endsAt). The POS service uses this every checkout, so
     * it's a small focused query (no JOINs, indexed on shop+active).
     */
    @Query("SELECT p FROM PromoCampaign p "
            + "WHERE p.active = TRUE "
            + "  AND p.startsAt <= :now AND p.endsAt > :now "
            + "ORDER BY p.startsAt DESC")
    List<PromoCampaign> findActiveAt(@Param("now") LocalDateTime now);
}
