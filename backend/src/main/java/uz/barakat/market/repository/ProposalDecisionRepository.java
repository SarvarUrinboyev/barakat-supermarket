package uz.barakat.market.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.ProposalDecision;

public interface ProposalDecisionRepository extends JpaRepository<ProposalDecision, Long> {

    Optional<ProposalDecision> findByProposalId(Long proposalId);
}
