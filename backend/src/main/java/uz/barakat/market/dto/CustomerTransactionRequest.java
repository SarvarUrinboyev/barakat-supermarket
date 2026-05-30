package uz.barakat.market.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import uz.barakat.market.domain.CustomerTxType;

/**
 * Create payload for a customer-ledger line.
 *
 * <p>For {@code GOODS}, {@code productId} and {@code quantity} identify a
 * real in-stock warehouse product; the goods are deducted from stock.
 * For {@code PAYMENT} those are ignored and {@code description} is a note.
 */
public record CustomerTransactionRequest(
        LocalDate date,
        @NotNull(message = "Amal turi tanlanishi shart") CustomerTxType type,
        String description,
        @NotNull(message = "Summa kiritilishi shart")
        @Positive(message = "Summa musbat bo'lishi kerak") BigDecimal amount,
        Long productId,
        Integer quantity,
        String note) {

    /**
     * For a GOODS line the product and a positive quantity are mandatory
     * (they drive the stock deduction); for PAYMENT they are ignored.
     */
    @AssertTrue(message = "GOODS uchun mahsulot va musbat miqdor kiritilishi shart")
    public boolean isGoodsLineValid() {
        if (type != CustomerTxType.GOODS) {
            return true;
        }
        return productId != null && quantity != null && quantity > 0;
    }
}
