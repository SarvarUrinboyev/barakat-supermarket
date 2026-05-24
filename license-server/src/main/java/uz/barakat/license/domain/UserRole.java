package uz.barakat.license.domain;

/**
 * App-wide role of a user.
 *
 * <ul>
 *   <li>{@link #SUPER_ADMIN}  - the platform owner (Sarvar). Can create
 *       accounts, set passwords, manage subscriptions for everyone.</li>
 *   <li>{@link #ACCOUNT_OWNER} - a paying tenant who manages their own
 *       shops and staff.</li>
 *   <li>{@link #SHOP_USER}    - a cashier / shop staff member; works in
 *       a single shop under an account.</li>
 * </ul>
 */
public enum UserRole {
    SUPER_ADMIN,
    ACCOUNT_OWNER,
    SHOP_USER
}
