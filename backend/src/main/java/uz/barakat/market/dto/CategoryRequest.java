package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;

/** Create / rename payload for a product category. */
public record CategoryRequest(
        @NotBlank(message = "Toifa nomi kiritilishi shart") String name) {
}
