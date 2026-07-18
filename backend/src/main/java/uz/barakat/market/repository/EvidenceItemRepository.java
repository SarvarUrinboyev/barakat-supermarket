package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.EvidenceItem;

public interface EvidenceItemRepository extends JpaRepository<EvidenceItem, Long> {

    List<EvidenceItem> findAllByOrderByIdDesc();
}
