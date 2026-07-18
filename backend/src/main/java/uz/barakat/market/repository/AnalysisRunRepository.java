package uz.barakat.market.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.market.domain.AnalysisRun;

public interface AnalysisRunRepository extends JpaRepository<AnalysisRun, Long> {

    List<AnalysisRun> findAllByOrderByIdDesc();
}
