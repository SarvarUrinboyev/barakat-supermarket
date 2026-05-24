package uz.barakat.license.auth;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

/**
 * RFC 6238 TOTP for super-admin two-factor auth (Phase 4.5).
 *
 * <p>Pure JDK — no third-party crypto dep. We use SHA-1 + 6-digit
 * codes + 30 s window because that's what every authenticator app
 * (Google Authenticator, 1Password, Authy, Microsoft Authenticator)
 * speaks by default. Verifying a code accepts the current window plus
 * one step on either side so a slightly skewed phone clock doesn't
 * lock the admin out.
 *
 * <p>Secrets are 160 bits (20 bytes) per the spec, exchanged with
 * authenticator apps as Base32 (no padding, uppercase).
 */
@Service
public class TotpService {

    private static final int SECRET_BYTES = 20;
    private static final int DIGITS = 6;
    private static final long STEP_SECONDS = 30L;
    /** ±1 step (=±30 s) — generous enough for clock drift, tight enough that a leaked code expires fast. */
    private static final int WINDOW = 1;

    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RNG = new SecureRandom();

    /** Fresh secret for a new TOTP setup. Returns the Base32 string the user pastes / scans. */
    public String generateSecret() {
        byte[] buf = new byte[SECRET_BYTES];
        RNG.nextBytes(buf);
        return base32Encode(buf);
    }

    /**
     * URI that authenticator apps render into a QR code. Format:
     * {@code otpauth://totp/<label>?secret=<S>&issuer=<I>&digits=6&period=30}.
     */
    public String otpauthUri(String username, String secret, String issuer) {
        String label = enc(issuer) + ":" + enc(username);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + enc(issuer)
                + "&algorithm=SHA1&digits=" + DIGITS
                + "&period=" + STEP_SECONDS;
    }

    /** True if {@code code} matches the secret within the accepted window. */
    public boolean verify(String secret, String code) {
        if (secret == null || code == null) return false;
        String trimmed = code.trim().replaceAll("\\D", "");
        if (trimmed.length() != DIGITS) return false;
        long now = System.currentTimeMillis() / 1000L / STEP_SECONDS;
        byte[] key = base32Decode(secret);
        for (int w = -WINDOW; w <= WINDOW; w++) {
            String expected = generate(key, now + w);
            if (constantTimeEquals(expected, trimmed)) return true;
        }
        return false;
    }

    // ============================================================ HOTP core

    private static String generate(byte[] key, long counter) {
        byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                       | ((hash[offset + 1] & 0xFF) << 16)
                       | ((hash[offset + 2] & 0xFF) << 8)
                       |  (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format("%06d", otp);
        } catch (Exception ex) {
            throw new IllegalStateException("HMAC-SHA1 unavailable", ex);
        }
    }

    // ============================================================ Base32

    static String base32Encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                sb.append(BASE32.charAt((buffer >> bits) & 0x1F));
            }
        }
        if (bits > 0) {
            sb.append(BASE32.charAt((buffer << (5 - bits)) & 0x1F));
        }
        return sb.toString();
    }

    static byte[] base32Decode(String s) {
        String upper = s.toUpperCase().replaceAll("[^A-Z2-7]", "");
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        int buffer = 0;
        int bits = 0;
        for (char c : upper.toCharArray()) {
            int v = BASE32.indexOf(c);
            if (v < 0) continue;
            buffer = (buffer << 5) | v;
            bits += 5;
            if (bits >= 8) {
                bits -= 8;
                out.write((buffer >> bits) & 0xFF);
            }
        }
        return out.toByteArray();
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /**
     * Length-prefixed constant-time comparison so a network timing attack
     * can't shave off the search space digit-by-digit.
     */
    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) result |= a.charAt(i) ^ b.charAt(i);
        return result == 0;
    }
}
