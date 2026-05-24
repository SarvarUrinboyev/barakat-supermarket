package uz.barakat.license.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * A user that can log in to SavdoPRO. {@code passwordHash} stores a
 * BCrypt hash — the plaintext password is never persisted. The user
 * always belongs to exactly one {@link Account} (super-admins belong
 * to account id 1).
 */
@Entity
@Table(name = "app_users")
@Getter
@Setter
public class AppUser extends BaseEntity {

    @Column(nullable = false, unique = true, length = 80)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "full_name", length = 180)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
}
