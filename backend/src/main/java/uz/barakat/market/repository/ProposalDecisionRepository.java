package uz.barakat.market.repository;

import java.util.Optional;
import org.springframework.data.repository.Repository;
import uz.barakat.market.domain.ProposalDecision;

/** Final decision rows are created once and never exposed for deletion or mutation. */
public interface ProposalDecisionRepository extends Repository<ProposalDecision, Long> {

    <S extends ProposalDecision> S save(S entity);

    Optional<ProposalDecision> findByProposalId(Long proposalId);
}
