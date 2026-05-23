package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;

/** Create/update payload for a customer. */
public record CustomerRequest(
        @NotBlank(message = "Mijoz ismi kiritilishi shart") String name,
        String phone,
        String address,
        String note) {
}
