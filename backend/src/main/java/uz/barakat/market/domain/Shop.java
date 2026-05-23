package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A single physical shop owned by an {@link Account}. One account may
 * have many shops; exactly one of them is flagged {@code isMain} and
 * acts as the consolidated rollup. Phase 1C-2 will add {@code shop_id}
 * columns to every transactional table so each shop has isolated data.
 */
@Entity
@Table(name = "shops")
@Getter
@Setter
public class Shop extends BaseEntity {

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(name = "is_main", nullable = false)
    private boolean main = false;

    @Column(length = 300)
    private String address;

    @Column(name = "contact_phone", length = 40)
    private String contactPhone;
}
