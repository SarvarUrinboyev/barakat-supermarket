package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.domain.PromoCampaign;
import uz.barakat.market.domain.PromoKind;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.PromoCampaignRepository;

/**
 * Promo-campaign CRUD. POS uses {@link uz.barakat.market.service.PromoService}
 * to auto-apply the best matching campaign at checkout — this controller
 * only manages the catalog.
 */
@RestController
@RequestMapping("/api/promos")
public class PromoController {

    private final PromoCampaignRepository promos;

    public PromoController(PromoCampaignRepository promos) {
        this.promos = promos;
    }

    @GetMapping
    public List<PromoCampaign> list() {
        return promos.findAllByOrderByStartsAtDesc();
    }

    @GetMapping("/active")
    public List<PromoCampaign> active() {
        return promos.findActiveAt(LocalDateTime.now());
    }

    @GetMapping("/{id}")
    public PromoCampaign get(@PathVariable Long id) {
        return promos.findById(id).orElseThrow(() -> NotFoundException.of("Aksiya", id));
    }

    @PostMapping
    public PromoCampaign create(@Valid @RequestBody PromoCampaign body) {
        body.setId(null);
        return promos.save(body);
    }

    @PutMapping("/{id}")
    public PromoCampaign update(@PathVariable Long id, @Valid @RequestBody PromoCampaign body) {
        PromoCampaign existing = promos.findById(id)
                .orElseThrow(() -> NotFoundException.of("Aksiya", id));
        existing.setName(body.getName());
        existing.setKind(body.getKind() == null ? PromoKind.PERCENT_OFF : body.getKind());
        existing.setValuePercent(body.getValuePercent());
        existing.setValueAmount(body.getValueAmount());
        existing.setMinSubtotalUzs(body.getMinSubtotalUzs());
        existing.setBuyQty(body.getBuyQty());
        existing.setGetQty(body.getGetQty());
        existing.setProductId(body.getProductId());
        existing.setCategoryId(body.getCategoryId());
        existing.setStartsAt(body.getStartsAt());
        existing.setEndsAt(body.getEndsAt());
        existing.setActive(body.isActive());
        existing.setWeekdayMask(body.getWeekdayMask() == 0 ? 127 : body.getWeekdayMask());
        existing.setDescription(body.getDescription());
        return promos.save(existing);
    }

    @DeleteMapping("/{id}")
    public void remove(@PathVariable Long id) {
        promos.deleteById(id);
    }
}
