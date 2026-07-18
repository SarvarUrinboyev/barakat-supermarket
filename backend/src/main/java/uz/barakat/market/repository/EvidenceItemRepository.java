package uz.barakat.market.repository;

import java.util.Optional;
import java.util.List;
import org.springframework.data.repository.Repository;
import uz.barakat.market.domain.EvidenceItem;

/** Deliberately omits delete/update-specific repository operations: evidence is append-only. */
public interface EvidenceItemRepository extends Repository<EvidenceItem, Long> {

    <S extends EvidenceItem> S save(S entity);

    Optional<EvidenceItem> findById(Long id);

    List<EvidenceItem> findAllByOrderByIdDesc();
}
