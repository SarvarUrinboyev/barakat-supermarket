package uz.barakat.license.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Issues and validates short-lived numeric one-time codes for SMS login.
 *
 * <p>State lives in an in-memory map — fine for the single-node License
 * Server VPS deploy. If we ever scale horizontally this needs to move
 * to Redis (the obvious replacement) so a code minted on one node can
 * be verified on another.
 *
 * <p>Policy:
 * <ul>
 *   <li>6-digit code, generated with {@link SecureRandom}.</li>
 *   <li>5 minute TTL. A second request within the cooldown window
 *       ({@link #COOLDOWN_SECONDS}) is rejected to prevent SMS bombing.</li>
 *   <li>Each {@code verify} that returns {@code true} consumes the code —
 *       it cannot be replayed.</li>
 *   <li>After {@link #MAX_VERIFY_ATTEMPTS} failed verifies for one code,
 *       the code is wiped and the user must request a new one.</li>
 * </ul>
 */
@Service
public class OtpService {

    static final Duration TTL = Duration.ofMinutes(5);
    static final long COOLDOWN_SECONDS = 30;
    static final int MAX_VERIFY_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, Entry> codes = new ConcurrentHashMap<>();

    /** Visible for testing — overridden in tests that want a deterministic clock. */
    java.util.function.Supplier<Instant> clock = Instant::now;

    /**
     * Issue (or rotate) the code bound to {@code phone}. Returns the
     * plaintext code so the SMS layer can deliver it. A second request
     * inside {@link #COOLDOWN_SECONDS} after the previous issue returns
     * {@link Result.CooldownActive} so the SMS layer doesn't send a
     * duplicate.
     */
    public Result requestCode(String phone) {
        if (phone == null || phone.isBlank()) {
            return new Result.BadPhone();
        }
        Instant now = clock.get();
        Entry existing = codes.get(phone);
        if (existing != null
                && Duration.between(existing.issuedAt, now).getSeconds() < COOLDOWN_SECONDS) {
            return new Result.CooldownActive(
                    COOLDOWN_SECONDS - Duration.between(existing.issuedAt, now).getSeconds());
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        codes.put(phone, new Entry(code, now, now.plus(TTL), 0));
        return new Result.Issued(code);
    }

    /**
     * Verify {@code code} against the active OTP for {@code phone}.
     * Returns true on first match and consumes the entry; returns false
     * (without consuming) on mismatch, but increments the attempt counter
     * and wipes the entry once {@link #MAX_VERIFY_ATTEMPTS} is hit.
     */
    public boolean verify(String phone, String code) {
        if (phone == null || code == null) return false;
        Entry e = codes.get(phone);
        if (e == null) return false;
        Instant now = clock.get();
        if (now.isAfter(e.expiresAt)) {
            codes.remove(phone);
            return false;
        }
        if (e.code.equals(code.trim())) {
            codes.remove(phone);
            return true;
        }
        // Wrong code — burn an attempt.
        int newAttempts = e.attempts + 1;
        if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
            codes.remove(phone);
        } else {
            codes.put(phone, new Entry(e.code, e.issuedAt, e.expiresAt, newAttempts));
        }
        return false;
    }

    /** Visible for testing — drop the bucket without verifying. */
    void clear(String phone) {
        codes.remove(phone);
    }

    private record Entry(String code, Instant issuedAt, Instant expiresAt, int attempts) { }

    /** Sealed-style result hierarchy without the Java 21 sealed keyword. */
    public abstract static class Result {
        private Result() { }

        public static final class Issued extends Result {
            private final String code;
            public Issued(String code) { this.code = code; }
            public String code() { return code; }
        }
        public static final class CooldownActive extends Result {
            private final long secondsRemaining;
            public CooldownActive(long s) { this.secondsRemaining = s; }
            public long secondsRemaining() { return secondsRemaining; }
        }
        public static final class BadPhone extends Result { }
    }
}
