package uz.barakat.market.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A shop customer ("Mijoz"): name plus contact details. */
@Entity
@Table(name = "customers")
@Getter
@Setter
public class Customer extends BaseEntity {

    @Column(nullable = false)
    private String name;

    /** Phone number; free-form text, optional. */
    @Column(length = 60)
    private String phone;

    @Column(length = 500)
    private String address;

    @Column(length = 500)
    private String note;

    /** Telegram chat id once the customer links the self-service bot; null until then. */
    @Column(name = "telegram_chat_id")
    private Long telegramChatId;
}
