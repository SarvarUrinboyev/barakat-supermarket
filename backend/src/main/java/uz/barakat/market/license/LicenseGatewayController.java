package uz.barakat.market.license;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Browser-visible, explicitly mapped façade for the private License Server. */
@RestController
@RequestMapping("/api/license")
public class LicenseGatewayController {

    private final LicenseGatewayService gateway;

    public LicenseGatewayController(LicenseGatewayService gateway) {
        this.gateway = gateway;
    }

    @PostMapping(value = "/auth/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> login(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_LOGIN); }
    @PostMapping(value = "/auth/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> register(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_REGISTER); }
    @GetMapping("/auth/signup/config")
    public ResponseEntity<byte[]> signupConfig(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_SIGNUP_CONFIG); }
    @PostMapping(value = "/auth/signup/request-otp", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> signupRequestOtp(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_SIGNUP_REQUEST_OTP); }
    @PostMapping(value = "/auth/social/google", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> socialGoogle(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_SOCIAL_GOOGLE); }
    @PostMapping(value = "/auth/telegram", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> telegram(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_TELEGRAM); }
    @PostMapping(value = "/auth/social/facebook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> socialFacebook(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_SOCIAL_FACEBOOK); }
    @PostMapping(value = "/auth/social/x", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> socialX(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_SOCIAL_X); }
    @PostMapping(value = "/auth/forgot-password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> forgotPassword(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_FORGOT_PASSWORD); }
    @PostMapping(value = "/auth/reset-password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> resetPassword(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_RESET_PASSWORD); }
    @PostMapping(value = "/auth/refresh", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> refresh(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_REFRESH); }
    @PostMapping(value = "/auth/logout", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> logout(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_LOGOUT); }
    @GetMapping("/auth/me")
    public ResponseEntity<byte[]> me(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.AUTH_ME); }

    @GetMapping("/billing/status")
    public ResponseEntity<byte[]> billingStatus(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.BILLING_STATUS); }
    @PostMapping(value = "/billing/checkout", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> billingCheckout(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.BILLING_CHECKOUT); }
    @GetMapping("/billing/payments")
    public ResponseEntity<byte[]> billingPayments(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.BILLING_PAYMENTS); }

    @GetMapping("/admin/audit")
    public ResponseEntity<byte[]> audit(HttpServletRequest request) {
        try {
            return gateway.forward(request, LicenseGatewayRoute.ADMIN_AUDIT,
                    LicenseGatewayRoute.ADMIN_AUDIT.upstreamPath() + "?" + auditQuery(request));
        } catch (IllegalArgumentException ex) {
            return LicenseGatewayService.badRequest("LICENSE_QUERY_NOT_ALLOWED");
        }
    }
    @GetMapping("/admin/accounts")
    public ResponseEntity<byte[]> accounts(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.ADMIN_ACCOUNTS); }
    @GetMapping("/admin/accounts/{accountId}")
    public ResponseEntity<byte[]> account(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_ACCOUNT, accountId); }
    @PostMapping(value = "/admin/accounts/{accountId}/grant", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> grant(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_GRANT, accountId); }
    @PostMapping(value = "/admin/accounts", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> createAccount(HttpServletRequest request) { return forward(request, LicenseGatewayRoute.ADMIN_CREATE_ACCOUNT); }
    @PutMapping(value = "/admin/accounts/{accountId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> updateAccount(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_UPDATE_ACCOUNT, accountId); }
    @PatchMapping(value = "/admin/accounts/{accountId}/block", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> blockAccount(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_BLOCK_ACCOUNT, accountId); }
    @PatchMapping(value = "/admin/accounts/{accountId}/modules", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> modules(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_MODULES, accountId); }
    @DeleteMapping("/admin/accounts/{accountId}")
    public ResponseEntity<byte[]> deleteAccount(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_DELETE_ACCOUNT, accountId); }
    @PostMapping(value = "/admin/accounts/{accountId}/users", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> createUser(HttpServletRequest request, @PathVariable long accountId) { return forward(request, LicenseGatewayRoute.ADMIN_CREATE_USER, accountId); }
    @PatchMapping(value = "/admin/users/{userId}/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> resetUserPassword(HttpServletRequest request, @PathVariable long userId) { return forward(request, LicenseGatewayRoute.ADMIN_RESET_PASSWORD, userId); }
    @PatchMapping(value = "/admin/users/{userId}/permissions", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> permissions(HttpServletRequest request, @PathVariable long userId) { return forward(request, LicenseGatewayRoute.ADMIN_PERMISSIONS, userId); }
    @DeleteMapping("/admin/users/{userId}")
    public ResponseEntity<byte[]> deleteUser(HttpServletRequest request, @PathVariable long userId) { return forward(request, LicenseGatewayRoute.ADMIN_DELETE_USER, userId); }

    private ResponseEntity<byte[]> forward(HttpServletRequest request, LicenseGatewayRoute route, long... ids) {
        if (request.getQueryString() != null) {
            return LicenseGatewayService.badRequest("LICENSE_QUERY_NOT_ALLOWED");
        }
        return gateway.forward(request, route, route.upstreamPath(ids));
    }

    private static String auditQuery(HttpServletRequest request) {
        String raw = request.getQueryString();
        if (raw == null || raw.isBlank()) {
            return "page=0&size=50";
        }
        Set<String> seen = new HashSet<>();
        for (String pair : raw.split("&", -1)) {
            int separator = pair.indexOf('=');
            if (separator < 1) throw new IllegalArgumentException("invalid query");
            String key = URLDecoder.decode(pair.substring(0, separator), StandardCharsets.UTF_8);
            if ((!("page".equals(key) || "size".equals(key))) || !seen.add(key)) {
                throw new IllegalArgumentException("invalid query");
            }
        }
        int page = boundedParameter(request, "page", 0, 0, Integer.MAX_VALUE);
        int size = boundedParameter(request, "size", 50, 1, 200);
        return "page=" + page + "&size=" + size;
    }

    private static int boundedParameter(HttpServletRequest request, String name, int fallback,
                                        int minimum, int maximum) {
        String value = request.getParameter(name);
        if (value == null) return fallback;
        try {
            int parsed = Integer.parseInt(value);
            if (parsed < minimum || parsed > maximum) throw new NumberFormatException();
            return parsed;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("invalid query");
        }
    }
}
