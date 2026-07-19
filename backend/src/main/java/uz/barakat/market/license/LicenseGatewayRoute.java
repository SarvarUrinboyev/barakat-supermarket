package uz.barakat.market.license;

import org.springframework.http.HttpMethod;

/**
 * Closed allowlist for the browser-facing License gateway. Every route maps to
 * one known License Server endpoint; no caller-controlled path is ever used.
 */
public enum LicenseGatewayRoute {
    AUTH_LOGIN(HttpMethod.POST, "/api/auth/login", true),
    AUTH_REGISTER(HttpMethod.POST, "/api/auth/register", true),
    AUTH_SIGNUP_CONFIG(HttpMethod.GET, "/api/auth/signup/config", false),
    AUTH_SIGNUP_REQUEST_OTP(HttpMethod.POST, "/api/auth/signup/request-otp", true),
    AUTH_SOCIAL_GOOGLE(HttpMethod.POST, "/api/auth/social/google", true),
    AUTH_TELEGRAM(HttpMethod.POST, "/api/auth/telegram", true),
    AUTH_SOCIAL_FACEBOOK(HttpMethod.POST, "/api/auth/social/facebook", true),
    AUTH_SOCIAL_X(HttpMethod.POST, "/api/auth/social/x", true),
    AUTH_FORGOT_PASSWORD(HttpMethod.POST, "/api/auth/forgot-password", true),
    AUTH_RESET_PASSWORD(HttpMethod.POST, "/api/auth/reset-password", true),
    AUTH_REFRESH(HttpMethod.POST, "/api/auth/refresh", true),
    AUTH_LOGOUT(HttpMethod.POST, "/api/auth/logout", true),
    AUTH_ME(HttpMethod.GET, "/api/auth/me", false),
    BILLING_STATUS(HttpMethod.GET, "/api/billing/status", false),
    BILLING_CHECKOUT(HttpMethod.POST, "/api/billing/checkout", true),
    BILLING_PAYMENTS(HttpMethod.GET, "/api/billing/payments", false),
    ADMIN_AUDIT(HttpMethod.GET, "/api/admin/audit", false),
    ADMIN_ACCOUNTS(HttpMethod.GET, "/api/admin/accounts", false),
    ADMIN_ACCOUNT(HttpMethod.GET, "/api/admin/accounts/%d", false),
    ADMIN_GRANT(HttpMethod.POST, "/api/admin/accounts/%d/grant", true),
    ADMIN_CREATE_ACCOUNT(HttpMethod.POST, "/api/admin/accounts", true),
    ADMIN_UPDATE_ACCOUNT(HttpMethod.PUT, "/api/admin/accounts/%d", true),
    ADMIN_BLOCK_ACCOUNT(HttpMethod.PATCH, "/api/admin/accounts/%d/block", true),
    ADMIN_MODULES(HttpMethod.PATCH, "/api/admin/accounts/%d/modules", true),
    ADMIN_DELETE_ACCOUNT(HttpMethod.DELETE, "/api/admin/accounts/%d", false),
    ADMIN_CREATE_USER(HttpMethod.POST, "/api/admin/accounts/%d/users", true),
    ADMIN_RESET_PASSWORD(HttpMethod.PATCH, "/api/admin/users/%d/password", true),
    ADMIN_PERMISSIONS(HttpMethod.PATCH, "/api/admin/users/%d/permissions", true),
    ADMIN_DELETE_USER(HttpMethod.DELETE, "/api/admin/users/%d", false);

    private final HttpMethod method;
    private final String pathTemplate;
    private final boolean jsonBody;

    LicenseGatewayRoute(HttpMethod method, String pathTemplate, boolean jsonBody) {
        this.method = method;
        this.pathTemplate = pathTemplate;
        this.jsonBody = jsonBody;
    }

    public HttpMethod method() {
        return method;
    }

    public boolean jsonBody() {
        return jsonBody;
    }

    public String upstreamPath(long... ids) {
        return ids.length == 0 ? pathTemplate : pathTemplate.formatted(ids[0]);
    }
}
