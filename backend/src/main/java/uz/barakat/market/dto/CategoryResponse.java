package uz.barakat.market.dto;

/** API view of a category, including how many products belong to it. */
public record CategoryResponse(
        Long id,
        String name,
        long productCount) {
}
