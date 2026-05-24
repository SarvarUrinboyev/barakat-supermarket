package uz.barakat.market.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.hardware.PrintService;
import uz.barakat.market.hardware.PrintService.PrintResult;

/**
 * Hardware integration endpoints (Phase 4.3): list printers, print a
 * test page, print a sale receipt, kick the cash drawer. The active
 * shop's {@code printer_name} from V16 is the routing key — null falls
 * back to the OS default.
 */
@RestController
@RequestMapping("/api/print")
public class PrintController {

    private final PrintService service;

    public PrintController(PrintService service) {
        this.service = service;
    }

    /** Used by the shop-settings dropdown to populate the printer picker. */
    @GetMapping("/printers")
    public List<String> printers() {
        return service.listPrinters();
    }

    /** "Print test page" button in shop settings. */
    @PostMapping("/test")
    public PrintResult test() {
        return service.printTestPage();
    }

    /** Open the cash drawer without printing — for the "no-sale" button. */
    @PostMapping("/drawer")
    public PrintResult drawer() {
        return service.openDrawer();
    }

    /**
     * Print a sale receipt. The frontend builds the line-items array
     * client-side from the active cart so we don't have to fetch a
     * Payment/Sale entity here — keeps the print pipeline orthogonal
     * to the storage path (which lets the cashier reprint a cancelled
     * sale without leaving stray rows in the DB).
     */
    @PostMapping("/receipt")
    public PrintResult receipt(@Valid @RequestBody ReceiptRequest body) {
        // Hop from the validation-friendly DTO to the service-level
        // record. Keeps the service layer free of Jakarta-Validation
        // annotations and stops the implicit record accessor name from
        // colliding with a hand-written conversion method.
        List<PrintService.ReceiptItem> svcItems = body.items().stream()
                .map(i -> new PrintService.ReceiptItem(
                        i.name(), i.qty(), i.unitPrice(), i.lineTotal()))
                .toList();
        return service.printReceipt(
                body.customerLabel(), body.paymentMethod(),
                svcItems, body.total(), body.paid(), body.change());
    }

    public record ReceiptItemDto(
            @NotNull String name,
            @NotNull @Positive BigDecimal qty,
            @NotNull BigDecimal unitPrice,
            @NotNull BigDecimal lineTotal) { }

    public record ReceiptRequest(
            String customerLabel,
            String paymentMethod,
            @NotEmpty List<ReceiptItemDto> items,
            @NotNull BigDecimal total,
            BigDecimal paid,
            BigDecimal change) { }
}
