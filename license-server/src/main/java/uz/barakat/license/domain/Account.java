package uz.barakat.license.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/**
 * One paying tenant of the SavdoPRO platform — a single shop owner who
 * may have many sub-shops underneath. The subscription lifecycle is
 * encoded by {@code subscriptionExpires} (cut-off date) and {@code blocked}
 * (super-admin manual lock). The desktop app checks these fields at
 * every login and refuses access if blocked or expired.
 */
@Entity
@Table(name = "accounts")
@Getter
@Setter
public class Account extends BaseEntity {

    @Column(nullable = false, length = 180)
    private String name;

    @Column(name = "contact_phone", length = 40)
    private String contactPhone;

    @Column(name = "contact_note", length = 500)
    private String contactNote;

    /**
     * Last paid day. {@code null} = no subscription tracking (e.g. the
     * super-admin account). After this date the account auto-blocks.
     */
    @Column(name = "subscription_expires")
    private LocalDate subscriptionExpires;

    /** Manual lock by the super-admin. Overrides the expiry check. */
    @Column(nullable = false)
    private boolean blocked = false;
}
