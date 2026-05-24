package uz.barakat.market.auth;

import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.repository.AccountRepository;

/**
 * Mid-session account-state validator used by {@link JwtAuthFilter}.
 *
 * <p>Phase 2: login + /me + password handling now live on the central
 * License Server. The desktop's local backend only retains the
 * {@link #isAccountUsable(Long)} check, which the JWT filter calls on
 * every request to bounce sessions whose account was blocked or whose
 * subscription expired since the token was issued.
 *
 * <p>Unknown account ids are trusted (returned as usable) because the
 * License Server is the authoritative source — the local accounts
 * table is a sparse mirror seeded on first login by
 * {@link uz.barakat.market.repository.AccountRepository#insertStubIfAbsent(Long, String)}.
 */
@Service
public class AuthService {

    private final AccountRepository accounts;

    public AuthService(AccountRepository accounts) {
        this.accounts = accounts;
    }

    @Transactional(readOnly = true)
    public boolean isAccountUsable(Long accountId) {
        if (accountId == null) return false;
        return accounts.findById(accountId).map(a -> {
            if (a.isBlocked()) return false;
            return a.getSubscriptionExpires() == null
                    || !a.getSubscriptionExpires().isBefore(LocalDate.now());
        }).orElse(true);   // unknown locally → trust the License Server.
    }
}
