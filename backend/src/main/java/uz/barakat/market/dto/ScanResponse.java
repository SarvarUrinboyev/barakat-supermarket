package uz.barakat.market.dto;

/**
 * Result of scanning a barcode. When {@code found} is true the product
 * existed and its stock was increased by one; otherwise the barcode is
 * unknown and the UI should offer to create a new product.
 */
public record ScanResponse(
        boolean found,
        String barcode,
        ProductResponse product) {
}
