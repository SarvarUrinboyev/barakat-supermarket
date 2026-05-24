package uz.barakat.license.auth;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

/** Login / session DTOs grouped in one file to avoid noise. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Login kiritilishi shart") String username,
            @NotBlank(message = "Parol kiritilishi shart") String password) {
    }

    public record LoginResponse(
            String token,
            MeResponse user) {
    }

    /** Snapshot of the current session: who and which account. */
    public record MeResponse(
            Long userId,
            String username,
            String fullName,
            String role,
            Long accountId,
            String accountName,
            LocalDate subscriptionExpires,
            int daysUntilBlock,
            boolean blocked) {
    }
}
