package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;

/** Payload to create or update a supplier. */
public record SupplierRequest(
        @NotBlank(message = "Yetkazib beruvchi ismi kiritilishi shart") String name,
        String phone,
        String address,
        String note) {
}
