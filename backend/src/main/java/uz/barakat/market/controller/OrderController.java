package uz.barakat.market.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.OrderCompleteRequest;
import uz.barakat.market.dto.OrderRequest;
import uz.barakat.market.dto.OrderResponse;
import uz.barakat.market.dto.OrdersByStatus;
import uz.barakat.market.service.OrderService;

/** REST API for expected goods orders. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderResponse> all() {
        return service.listAll();
    }

    @GetMapping("/grouped")
    public OrdersByStatus grouped() {
        return service.grouped();
    }

    @GetMapping("/today")
    public List<OrderResponse> today() {
        return service.listToday();
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody OrderRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public OrderResponse update(@PathVariable Long id, @Valid @RequestBody OrderRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    /** "Keldi": mark the order received and auto-create the expense. */
    @PatchMapping("/{id}/complete")
    public OrderResponse complete(@PathVariable Long id,
                                  @Valid @RequestBody OrderCompleteRequest request) {
        return service.complete(id, request);
    }
}
