package uz.barakat.license.auth;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.license.domain.AppUser;
import uz.barakat.license.domain.UserRole;
import uz.barakat.license.repository.AppUserRepository;

/**
 * Bootstraps the super-admin user on first launch so the desktop login
 * screen actually has a valid account to authenticate against.
 *
 * <p>The credentials are read from {@code application-local.properties}
 * (gitignored) so they never end up in the repo. If the configured user
 * doesn't exist yet it is created; if it exists, the password is left
 * alone (manual change via SQL / admin API later).
 */
@Component
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppUserRepository users;
    private final String adminUsername;
    private final String adminPassword;
    private final String adminFullName;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AdminBootstrap(AppUserRepository users,
                          @Value("${savdopro.admin.username:admin}") String username,
                          @Value("${savdopro.admin.password:admin123}") String password,
                          @Value("${savdopro.admin.full-name:Super Admin}") String fullName) {
        this.users = users;
        this.adminUsername = username;
        this.adminPassword = password;
        this.adminFullName = fullName;
    }

    @PostConstruct
    @Transactional
    public void ensureAdmin() {
        if (users.existsByUsernameIgnoreCase(adminUsername)) {
            return;
        }
        AppUser u = new AppUser();
        u.setUsername(adminUsername.toLowerCase());
        u.setPasswordHash(encoder.encode(adminPassword));
        u.setFullName(adminFullName);
        u.setRole(UserRole.SUPER_ADMIN);
        u.setAccountId(1L); // seeded super-admin account
        users.save(u);
        log.info("Bootstrapped super-admin user '{}' (change the password!)", adminUsername);
    }
}
