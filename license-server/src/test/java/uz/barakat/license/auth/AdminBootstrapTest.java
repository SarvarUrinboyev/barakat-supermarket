package uz.barakat.license.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import uz.barakat.license.domain.AppUser;
import uz.barakat.license.domain.UserRole;
import uz.barakat.license.repository.AppUserRepository;

/**
 * Unit tests for the weak-password gate and seeding behaviour of
 * {@link AdminBootstrap}. The bootstrap is wired by hand here — we
 * don't need the Spring context to exercise the constructor + the
 * {@code ensureAdmin()} lifecycle method.
 */
@ExtendWith(MockitoExtension.class)
class AdminBootstrapTest {

    private static final String USERNAME = "admin";
    private static final String FULL_NAME = "Super Admin";
    private static final String STRONG_PASSWORD = "Sup3rStr0ngPa55!";

    @Mock private AppUserRepository users;

    @Test
    void weakPasswordWithoutDevFlagRefusesToStart() {
        when(users.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.empty());
        AdminBootstrap bootstrap = new AdminBootstrap(
                users, USERNAME, "admin123", FULL_NAME, false);

        IllegalStateException ex = assertThrows(
                IllegalStateException.class, bootstrap::ensureAdmin);

        assertTrue(ex.getMessage().contains("REFUSING TO START"),
                "expected REFUSING TO START in message, got: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("SAVDOPRO_ADMIN_PASSWORD"),
                "message should point at the env var to set, got: " + ex.getMessage());
        verify(users, never()).save(any(AppUser.class));
    }

    @Test
    void weakPasswordWithDevFlagBootsAndCreatesUser() {
        when(users.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.empty());
        when(users.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        AdminBootstrap bootstrap = new AdminBootstrap(
                users, USERNAME, "admin123", FULL_NAME, true);

        bootstrap.ensureAdmin();

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(users).save(captor.capture());
        AppUser saved = captor.getValue();
        assertEquals(USERNAME, saved.getUsername());
        assertEquals(FULL_NAME, saved.getFullName());
        assertEquals(UserRole.SUPER_ADMIN, saved.getRole());
        assertEquals(1L, saved.getAccountId());
    }

    @Test
    void strongPasswordCreatesSuperAdminWithBcryptHash() {
        when(users.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.empty());
        when(users.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        AdminBootstrap bootstrap = new AdminBootstrap(
                users, USERNAME, STRONG_PASSWORD, FULL_NAME, false);

        bootstrap.ensureAdmin();

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(users).save(captor.capture());
        AppUser saved = captor.getValue();
        assertEquals(USERNAME, saved.getUsername());
        assertEquals(FULL_NAME, saved.getFullName());
        assertEquals(UserRole.SUPER_ADMIN, saved.getRole());
        assertEquals(1L, saved.getAccountId());
        assertNotNull(saved.getPasswordHash(), "passwordHash must be stored");
        assertTrue(new BCryptPasswordEncoder().matches(STRONG_PASSWORD, saved.getPasswordHash()),
                "stored hash must verify against the plaintext password");
    }

    @Test
    void existingAdminWithStrongHashMakesEnsureAdminNoOp() {
        AppUser existing = adminWithHash(STRONG_PASSWORD);
        when(users.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.of(existing));
        AdminBootstrap bootstrap = new AdminBootstrap(
                users, USERNAME, STRONG_PASSWORD, FULL_NAME, false);

        bootstrap.ensureAdmin();

        verify(users, never()).save(any(AppUser.class));
    }

    /**
     * The stored hash matches a well-known weak default → the bootstrap
     * must warn (via the SLF4J logger; we don't assert on that here) and
     * carry on. Throwing would lock the operator out of the very system
     * they need to log into to rotate the password.
     */
    @Test
    void existingAdminWithWeakHashWarnsButDoesNotThrowOrSave() {
        AppUser existing = adminWithHash("admin123");
        when(users.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.of(existing));
        AdminBootstrap bootstrap = new AdminBootstrap(
                users, USERNAME, STRONG_PASSWORD, FULL_NAME, false);

        bootstrap.ensureAdmin();   // does not throw

        verify(users, never()).save(any(AppUser.class));
    }

    private static AppUser adminWithHash(String plaintext) {
        AppUser u = new AppUser();
        u.setUsername(USERNAME);
        u.setPasswordHash(new BCryptPasswordEncoder().encode(plaintext));
        u.setRole(UserRole.SUPER_ADMIN);
        u.setAccountId(1L);
        return u;
    }

    /**
     * Every well-known weak default (in every case variant we care about),
     * plus a few boundary-length values, must trip the gate. If this test
     * fails after a refactor it almost certainly means
     * {@link AdminBootstrap#WEAK_DEFAULT_PASSWORDS} or
     * {@link AdminBootstrap#MIN_PASSWORD_LENGTH} silently lost an entry.
     */
    @ParameterizedTest(name = "[{index}] \"{0}\" must be rejected")
    @ValueSource(strings = {
            // The 7 explicit weak defaults.
            "admin", "admin123", "password", "12345678", "qwerty", "savdopro", "barakat",
            // Case variants — equalsIgnoreCase / toLowerCase contract.
            "ADMIN123", "Admin123", "PASSWORD", "QwErTy", "BARAKAT",
            // Boundary lengths — anything below MIN_PASSWORD_LENGTH (8).
            "", "a", "abc", "1234567",
            // Complexity rule — must contain at least one letter AND one digit.
            "abcdefgh", "supermarket", "STRONGPASS",   // all letters, no digit
            "11111111", "19990101", "987654321",        // all digits, no letter
            "!!!!!!!!", "        "                        // no letter, no digit
    })
    void rejectsEveryWeakOrTooShortValue(String weak) {
        when(users.findByUsernameIgnoreCase(USERNAME)).thenReturn(Optional.empty());
        AdminBootstrap bootstrap = new AdminBootstrap(
                users, USERNAME, weak, FULL_NAME, false);

        assertThrows(IllegalStateException.class, bootstrap::ensureAdmin,
                "value \"" + weak + "\" should have been rejected");
        verify(users, never()).save(any(AppUser.class));
    }
}
