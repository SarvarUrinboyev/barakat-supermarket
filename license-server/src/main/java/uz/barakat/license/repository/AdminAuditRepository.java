package uz.barakat.license.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.barakat.license.domain.AdminAuditEntry;

public interface AdminAuditRepository extends JpaRepository<AdminAuditEntry, Long> {

    /** Newest first, paginated — used by the browser admin panel. */
    Page<AdminAuditEntry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Inclusive-from, exclusive-to date range; ordered oldest-first so the
     * exported CSV reads like a journal. The caller is expected to cap the
     * range — a 5-year scan over a busy tenant can still produce hundreds
     * of MB of CSV.
     */
    List<AdminAuditEntry> findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
            LocalDateTime from, LocalDateTime to);
}
