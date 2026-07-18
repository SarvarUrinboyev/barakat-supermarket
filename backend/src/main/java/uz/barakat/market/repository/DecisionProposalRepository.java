package uz.barakat.market.repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.barakat.market.domain.DecisionProposal;

public interface DecisionProposalRepository extends JpaRepository<DecisionProposal, Long> {

    List<DecisionProposal> findAllByOrderByIdDesc();

    Optional<DecisionProposal> findByAnalysisRunIdAndSourceKind(Long analysisRunId, String sourceKind);

    /** Serializes decision transitions; the database unique key remains the final duplicate guard. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM DecisionProposal p WHERE p.id = :id")
    Optional<DecisionProposal> findByIdForUpdate(@Param("id") Long id);
}
