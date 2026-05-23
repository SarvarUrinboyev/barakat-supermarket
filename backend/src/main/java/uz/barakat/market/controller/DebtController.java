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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.CustomerDebtRequest;
import uz.barakat.market.dto.CustomerDebtResponse;
import uz.barakat.market.dto.DebtPaymentRequest;
import uz.barakat.market.dto.DebtPaymentResponse;
import uz.barakat.market.dto.DebtSummary;
import uz.barakat.market.dto.DebtorRequest;
import uz.barakat.market.dto.DebtorResponse;
import uz.barakat.market.service.DebtService;

/**
 * REST API for both sides of the Debt page: "my debts" ({@code /api/debtors})
 * and "debts owed to us" ({@code /api/customer-debts}).
 */
@RestController
public class DebtController {

    private final DebtService service;

    public DebtController(DebtService service) {
        this.service = service;
    }

    @GetMapping("/api/debts/summary")
    public DebtSummary summary() {
        return service.summary();
    }

    // ----------------------------------------------------------- my debts

    @GetMapping("/api/debtors")
    public List<DebtorResponse> myDebts() {
        return service.listMyDebts();
    }

    @PostMapping("/api/debtors")
    @ResponseStatus(HttpStatus.CREATED)
    public DebtorResponse createMyDebt(@Valid @RequestBody DebtorRequest request) {
        return service.createMyDebt(request);
    }

    @PutMapping("/api/debtors/{id}")
    public DebtorResponse updateMyDebt(@PathVariable Long id,
                                       @Valid @RequestBody DebtorRequest request) {
        return service.updateMyDebt(id, request);
    }

    @DeleteMapping("/api/debtors/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyDebt(@PathVariable Long id) {
        service.deleteMyDebt(id);
    }

    @PatchMapping("/api/debtors/{id}/partial-pay")
    public DebtorResponse payMyDebt(@PathVariable Long id,
                                    @Valid @RequestBody DebtPaymentRequest request) {
        return service.payMyDebt(id, request);
    }

    @PatchMapping("/api/debtors/{id}/add-amount")
    public DebtorResponse addToMyDebt(@PathVariable Long id,
                                      @Valid @RequestBody DebtPaymentRequest request) {
        return service.addToMyDebt(id, request);
    }

    @GetMapping("/api/debtors/{id}/history")
    public List<DebtPaymentResponse> myDebtHistory(@PathVariable Long id) {
        return service.myDebtHistory(id);
    }

    // ----------------------------------------------------- customer debts

    @GetMapping("/api/customer-debts")
    public List<CustomerDebtResponse> customerDebts() {
        return service.listCustomerDebts();
    }

    @PostMapping("/api/customer-debts")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerDebtResponse createCustomerDebt(@Valid @RequestBody CustomerDebtRequest request) {
        return service.createCustomerDebt(request);
    }

    @PutMapping("/api/customer-debts/{id}")
    public CustomerDebtResponse updateCustomerDebt(@PathVariable Long id,
                                                   @Valid @RequestBody CustomerDebtRequest request) {
        return service.updateCustomerDebt(id, request);
    }

    @DeleteMapping("/api/customer-debts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCustomerDebt(@PathVariable Long id) {
        service.deleteCustomerDebt(id);
    }

    @PatchMapping("/api/customer-debts/{id}/partial-pay")
    public CustomerDebtResponse payCustomerDebt(@PathVariable Long id,
                                                @Valid @RequestBody DebtPaymentRequest request) {
        return service.payCustomerDebt(id, request);
    }

    @PatchMapping("/api/customer-debts/{id}/add-amount")
    public CustomerDebtResponse addToCustomerDebt(@PathVariable Long id,
                                                  @Valid @RequestBody DebtPaymentRequest request) {
        return service.addToCustomerDebt(id, request);
    }

    @GetMapping("/api/customer-debts/{id}/history")
    public List<DebtPaymentResponse> customerDebtHistory(@PathVariable Long id) {
        return service.customerDebtHistory(id);
    }
}
