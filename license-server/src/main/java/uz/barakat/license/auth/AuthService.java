package uz.barakat.license.auth;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.license.auth.AuthDtos.LoginRequest;
import uz.barakat.license.auth.AuthDtos.LoginResponse;
import uz.barakat.license.auth.AuthDtos.MeResponse;
import uz.barakat.license.domain.Account;
import uz.barakat.license.domain.AppUser;
import uz.barakat.license.exception.BadRequestException;
import uz.barakat.license.repository.AccountRepository;
import uz.barakat.license.repository.AppUserRepository;

/**
 * Login / session validation. Rejects on bad credentials, blocked
 * accounts or expired subscriptions. Computes the "days until block"
 * countdown that the desktop UI shows as a warning banner.
 */
@Service
@Transactional
public class AuthService {

    /** Warn the user this many days before the subscription auto-blocks. */
    public static final int WARNING_THRESHOLD_DAYS = 4;

    private final AppUserRepository users;
    private final AccountRepository accounts;
    private final JwtService jwt;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(AppUserRepository users, AccountRepository accounts, JwtService jwt) {
        this.users = users;
        this.accounts = accounts;
        this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest request) {
        AppUser user = users.findByUsernameIgnoreCase(request.username().trim())
                .orElseThrow(() -> new BadRequestException("Login yoki parol noto'g'ri"));
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("Login yoki parol noto'g'ri");
        }
        Account account = requireUsableAccount(user.getAccountId());
        user.setLastLoginAt(LocalDateTime.now());
        users.save(user);
        return new LoginResponse(jwt.issue(user), toMe(user, account));
    }

    @Transactional(readOnly = true)
    public MeResponse me(Long userId) {
        AppUser user = users.findById(userId)
                .orElseThrow(() -> new BadRequestException("Sessiya yaroqsiz"));
        Account account = requireUsableAccount(user.getAccountId());
        return toMe(user, account);
    }

    /** Used by the JWT filter to reject blocked / expired accounts mid-session. */
    @Transactional(readOnly = true)
    public boolean isAccountUsable(Long accountId) {
        return accounts.findById(accountId).map(a -> {
            if (a.isBlocked()) return false;
            return a.getSubscriptionExpires() == null
                    || !a.getSubscriptionExpires().isBefore(LocalDate.now());
        }).orElse(false);
    }

    private Account requireUsableAccount(Long accountId) {
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new BadRequestException("Akkaunt topilmadi"));
        if (account.isBlocked()) {
            throw new BadRequestException("Akkaunt bloklangan. Super-admin bilan bog'laning.");
        }
        if (account.getSubscriptionExpires() != null
                && account.getSubscriptionExpires().isBefore(LocalDate.now())) {
            throw new BadRequestException(
                    "Obuna muddati tugagan ("
                            + account.getSubscriptionExpires()
                            + "). Super-admin bilan bog'laning.");
        }
        return account;
    }

    private MeResponse toMe(AppUser user, Account account) {
        int days = daysUntilBlock(account);
        return new MeResponse(
                user.getId(), user.getUsername(), user.getFullName(), user.getRole().name(),
                account.getId(), account.getName(),
                account.getSubscriptionExpires(), days, account.isBlocked());
    }

    private static int daysUntilBlock(Account account) {
        if (account.getSubscriptionExpires() == null) return Integer.MAX_VALUE;
        long diff = account.getSubscriptionExpires().toEpochDay() - LocalDate.now().toEpochDay();
        return (int) Math.max(0, diff);
    }
}
