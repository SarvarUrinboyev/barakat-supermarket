package uz.barakat.market.dto;

import jakarta.validation.constraints.NotBlank;

/** A barcode read by the scanner. */
public record ScanRequest(
        @NotBlank(message = "Shtrix kod bo'sh") String barcode) {
}
