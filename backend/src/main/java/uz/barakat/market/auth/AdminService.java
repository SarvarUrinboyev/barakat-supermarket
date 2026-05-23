package uz.barakat.market.auth;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.auth.AdminDtos.AccountDetailResponse;
import uz.barakat.market.auth.AdminDtos.AdminAccountResponse;
import uz.barakat.market.auth.AdminDtos.AdminUserResponse;
import uz.barakat.market.auth.AdminDtos.CreateAccountRequest;
import uz.barakat.market.auth.AdminDtos.CreateUserRequest;
import uz.barakat.market.auth.AdminDtos.UpdateAccountRequest;
import uz.barakat.market.domain.Account;
import uz.barakat.market.domain.AppUser;
import uz.barakat.market.domain.UserRole;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.AccountRepository;
import uz.barakat.market.repository.AppUserRepository;

/**
 * Super-admin operations: create / edit / block accounts, set or reset
 * passwords for any user. The controller layer enforces that the caller
 * has {@link UserRole#SUPER_ADMIN}; this service trusts that gate and
 * focuses on data integrity.
 */
@Service
@Transactional
public class AdminService {

    private final AccountRepository accounts;
    private final AppUserRepository users;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AdminService(AccountRepository accounts, AppUserRepository users) {
        this.accounts = accounts;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<AdminAccountResponse> listAccounts() {
        return accounts.findAll().stream()
                .sorted(Comparator.comparing(Account::getCreatedAt).reversed())
                .map(this::toAccountResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountDetailResponse accountDetail(Long id) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> NotFoundException.of("Akkaunt", id));
        List<AdminUserResponse> userList = users
                .findByAccountIdOrderByUsernameAsc(id).stream()
                .map(AdminService::toUserResponse)
                .toList();
        return new AccountDetailResponse(toAccountResponse(a), userList);
    }

    public AdminAccountResponse createAccount(CreateAccountRequest request) {
        String username = request.ownerUsername().trim().toLowerCase();
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new BadRequestException("Bu login band: " + username);
        }
        Account account = new Account();
        account.setName(request.name().trim());
        account.setContactPhone(blankToNull(request.contactPhone()));
        account.setContactNote(blankToNull(request.contactNote()));
        account.setSubscriptionExpires(request.subscriptionExpires());
        account.setBlocked(false);
        Account saved = accounts.save(account);

        AppUser owner = new AppUser();
        owner.setUsername(username);
        owner.setPasswordHash(encoder.encode(request.ownerPassword()));
        owner.setFullName(blankToNull(request.ownerFullName()));
        owner.setRole(UserRole.ACCOUNT_OWNER);
        owner.setAccountId(saved.getId());
        users.save(owner);

        return toAccountResponse(saved);
    }

    public AdminAccountResponse updateAccount(Long id, UpdateAccountRequest request) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> NotFoundException.of("Akkaunt", id));
        a.setName(request.name().trim());
        a.setContactPhone(blankToNull(request.contactPhone()));
        a.setContactNote(blankToNull(request.contactNote()));
        a.setSubscriptionExpires(request.subscriptionExpires());
        return toAccountResponse(accounts.save(a));
    }

    public AdminAccountResponse setBlocked(Long id, boolean blocked) {
        Account a = accounts.findById(id)
                .orElseThrow(() -> NotFoundException.of("Akkaunt", id));
        if (id == 1L && blocked) {
            throw new BadRequestException("Super-admin akkauntini bloklash mumkin emas");
        }
        a.setBlocked(blocked);
        return toAccountResponse(accounts.save(a));
    }

    public void deleteAccount(Long id) {
        if (id == 1L) {
            throw new BadRequestException("Super-admin akkauntini o'chirish mumkin emas");
        }
        Account a = accounts.findById(id)
                .orElseThrow(() -> NotFoundException.of("Akkaunt", id));
        // ON DELETE CASCADE on app_users.account_id wipes the linked users.
        accounts.delete(a);
    }

    public AdminUserResponse createUser(Long accountId, CreateUserRequest request) {
        accounts.findById(accountId)
                .orElseThrow(() -> NotFoundException.of("Akkaunt", accountId));
        String username = request.username().trim().toLowerCase();
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new BadRequestException("Bu login band: " + username);
        }
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPasswordHash(encoder.encode(request.password()));
        u.setFullName(blankToNull(request.fullName()));
        u.setRole(parseRole(request.role(), UserRole.SHOP_USER));
        u.setAccountId(accountId);
        return toUserResponse(users.save(u));
    }

    public void resetPassword(Long userId, String newPassword) {
        AppUser u = users.findById(userId)
                .orElseThrow(() -> NotFoundException.of("Foydalanuvchi", userId));
        u.setPasswordHash(encoder.encode(newPassword));
        users.save(u);
    }

    public void deleteUser(Long userId) {
        AppUser u = users.findById(userId)
                .orElseThrow(() -> NotFoundException.of("Foydalanuvchi", userId));
        if (u.getRole() == UserRole.SUPER_ADMIN) {
            throw new BadRequestException("Super-admin foydalanuvchini o'chirish mumkin emas");
        }
        users.delete(u);
    }

    // ------------------------------------------------------------ helpers

    private AdminAccountResponse toAccountResponse(Account a) {
        int userCount = users.findByAccountIdOrderByUsernameAsc(a.getId()).size();
        int days = a.getSubscriptionExpires() == null
                ? Integer.MAX_VALUE
                : (int) (a.getSubscriptionExpires().toEpochDay() - LocalDate.now().toEpochDay());
        boolean expired = a.getSubscriptionExpires() != null
                && a.getSubscriptionExpires().isBefore(LocalDate.now());
        return new AdminAccountResponse(
                a.getId(), a.getName(), a.getContactPhone(), a.getContactNote(),
                a.getSubscriptionExpires(), Math.max(0, days),
                a.isBlocked(), expired, userCount, a.getCreatedAt());
    }

    private static AdminUserResponse toUserResponse(AppUser u) {
        return new AdminUserResponse(
                u.getId(), u.getUsername(), u.getFullName(),
                u.getRole().name(), u.getLastLoginAt(), u.getCreatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static UserRole parseRole(String name, UserRole fallback) {
        if (name == null || name.isBlank()) return fallback;
        try {
            return UserRole.valueOf(name.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }
}
