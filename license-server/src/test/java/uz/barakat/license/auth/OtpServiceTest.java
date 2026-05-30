package uz.barakat.license.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

/** Unit tests for {@link OtpService}. The internal clock is mocked. */
class OtpServiceTest {

    private static final String PHONE = "+998901234567";

    private OtpService freshService(Instant now) {
        OtpService svc = new OtpService();
        AtomicReference<Instant> clock = new AtomicReference<>(now);
        svc.clock = clock::get;
        return svc;
    }

    private static void advance(OtpService svc, Duration by) {
        Instant current = svc.clock.get();
        svc.clock = () -> current.plus(by);
    }

    @Test
    void issuesSixDigitCode() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));

        OtpService.Result r = svc.requestCode(PHONE);

        assertInstanceOf(OtpService.Result.Issued.class, r);
        String code = ((OtpService.Result.Issued) r).code();
        assertEquals(6, code.length(), "expected 6-digit code, got " + code);
        assertTrue(code.matches("\\d{6}"), "code must be all digits, got " + code);
    }

    @Test
    void rejectsBlankPhone() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        assertInstanceOf(OtpService.Result.BadPhone.class, svc.requestCode(""));
        assertInstanceOf(OtpService.Result.BadPhone.class, svc.requestCode(null));
        assertInstanceOf(OtpService.Result.BadPhone.class, svc.requestCode("   "));
    }

    @Test
    void cooldownRejectsRequestWithinThirtySeconds() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        assertInstanceOf(OtpService.Result.Issued.class, svc.requestCode(PHONE));

        // Same instant — well inside the 30s cooldown.
        OtpService.Result r2 = svc.requestCode(PHONE);
        assertInstanceOf(OtpService.Result.CooldownActive.class, r2);
        long remaining = ((OtpService.Result.CooldownActive) r2).secondsRemaining();
        assertTrue(remaining > 0 && remaining <= OtpService.COOLDOWN_SECONDS,
                "cooldown remaining must be 1..30, got " + remaining);
    }

    @Test
    void newCodeAllowedAfterCooldown() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        OtpService.Result first = svc.requestCode(PHONE);
        String firstCode = ((OtpService.Result.Issued) first).code();

        advance(svc, Duration.ofSeconds(OtpService.COOLDOWN_SECONDS + 1));
        OtpService.Result second = svc.requestCode(PHONE);

        assertInstanceOf(OtpService.Result.Issued.class, second);
        // (Statistically, regenerated codes match the old one ~1 in a million —
        // good enough not to retry the test.)
        assertNotEquals(firstCode, ((OtpService.Result.Issued) second).code());
    }

    @Test
    void correctCodeVerifiesAndConsumes() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        String code = ((OtpService.Result.Issued) svc.requestCode(PHONE)).code();

        assertTrue(svc.verify(PHONE, code));
        // Replay must fail — verify consumes the entry.
        assertFalse(svc.verify(PHONE, code));
    }

    @Test
    void expiredCodeDoesNotVerify() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        String code = ((OtpService.Result.Issued) svc.requestCode(PHONE)).code();

        advance(svc, OtpService.TTL.plusSeconds(1));
        assertFalse(svc.verify(PHONE, code));
    }

    @Test
    void fiveWrongAttemptsBurnTheCode() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        String real = ((OtpService.Result.Issued) svc.requestCode(PHONE)).code();
        String wrong = real.equals("000000") ? "111111" : "000000";

        for (int i = 0; i < OtpService.MAX_VERIFY_ATTEMPTS; i++) {
            assertFalse(svc.verify(PHONE, wrong));
        }
        // After max attempts, even the correct code must be rejected.
        assertFalse(svc.verify(PHONE, real));
    }

    @Test
    void unknownPhoneReturnsFalse() {
        OtpService svc = freshService(Instant.parse("2026-05-28T12:00:00Z"));
        assertFalse(svc.verify("+9990000000", "123456"));
        assertFalse(svc.verify(null, "123456"));
    }
}
