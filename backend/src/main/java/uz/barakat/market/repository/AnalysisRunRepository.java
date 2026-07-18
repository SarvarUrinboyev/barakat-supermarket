package uz.barakat.market.repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.barakat.market.domain.AnalysisRun;

public interface AnalysisRunRepository extends JpaRepository<AnalysisRun, Long> {

    List<AnalysisRun> findAllByOrderByIdDesc();

    /** Serializes bridge creation for one authoritative simulation run. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM AnalysisRun r WHERE r.id = :id")
    Optional<AnalysisRun> findByIdForUpdate(@Param("id") Long id);
}
