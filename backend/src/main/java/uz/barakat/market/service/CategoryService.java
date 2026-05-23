package uz.barakat.market.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Category;
import uz.barakat.market.domain.Product;
import uz.barakat.market.dto.CategoryRequest;
import uz.barakat.market.dto.CategoryResponse;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.CategoryRepository;
import uz.barakat.market.repository.ProductRepository;

/** Product categories ("toifalar"). */
@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CategoryService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        Map<Long, Long> counts = products.findAll().stream()
                .filter(p -> p.getCategoryId() != null)
                .collect(Collectors.groupingBy(Product::getCategoryId, Collectors.counting()));
        return categories.findAllByOrderByNameAsc().stream()
                .map(c -> new CategoryResponse(c.getId(), c.getName(),
                        counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().strip();
        categories.findFirstByNameIgnoreCase(name).ifPresent(existing -> {
            throw new BadRequestException("Bunday toifa allaqachon mavjud: " + name);
        });
        Category category = new Category();
        category.setName(name);
        categories.save(category);
        return new CategoryResponse(category.getId(), category.getName(), 0L);
    }

    public void delete(Long id) {
        Category category = categories.findById(id)
                .orElseThrow(() -> NotFoundException.of("Toifa", id));
        // Products keep existing; their category_id is cleared by the FK rule.
        categories.delete(category);
    }

    /** Finds a category by name, creating it when missing. Used by the importer. */
    public Long resolveOrCreate(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        String clean = name.strip();
        return categories.findFirstByNameIgnoreCase(clean)
                .map(Category::getId)
                .orElseGet(() -> {
                    Category category = new Category();
                    category.setName(clean);
                    return categories.save(category).getId();
                });
    }
}
