package uz.barakat.market.service.savdograph.copilot;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import uz.barakat.market.exception.ForbiddenException;

/** Stable HMAC alias derived only from the authenticated internal numeric user ID. */
@Component
public class StoreCopilotSafety {

    private final byte[] hmacKey;

    public StoreCopilotSafety(@Value("${savdopro.jwt.secret:}") String jwtSecret) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("SavdoGraph copilot requires the configured server JWT secret");
        }
        this.hmacKey = jwtSecret.getBytes(StandardCharsets.UTF_8);
    }

    public String currentSafetyIdentifier() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || !authentication.getName().matches("[0-9]+")) {
            throw new ForbiddenException("Autentifikatsiyalangan ichki foydalanuvchi talab qilinadi");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey, "HmacSHA256"));
            byte[] digest = mac.doFinal(("savdograph-copilot:user:" + authentication.getName())
                    .getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder("savdo_");
            for (int index = 0; index < 24; index++) {
                result.append(String.format("%02x", digest[index]));
            }
            return result.toString();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Safety identifier could not be generated", ex);
        }
    }
}
