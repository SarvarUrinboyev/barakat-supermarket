package uz.barakat.market.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {

    /**
     * Insert a stub {@link Account} row with the given id <strong>only if
     * no row with that id exists yet</strong>. The local accounts table
     * is a mirror in Phase 2 (the License Server owns the real data),
     * so we need to seed it on demand when the JWT carries a brand-new
     * accountId — otherwise the {@code shops.account_id} FK fails.
     *
     * <p>Native SQL because {@link jakarta.persistence.GenerationType#IDENTITY}
     * blocks inserting an explicit primary key through JPA.
     */
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO accounts (id, name, blocked, created_at) "
            + "SELECT :id, :name, FALSE, CURRENT_TIMESTAMP "
            + "WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE id = :id)",
            nativeQuery = true)
    int insertStubIfAbsent(Long id, String name);
}
