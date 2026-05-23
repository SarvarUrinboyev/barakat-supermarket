package uz.barakat.market.dto;

import java.util.List;

/** Supplier detail: contact info + every journal entry that names them. */
public record SupplierDetailResponse(
        SupplierResponse supplier,
        List<PaymentResponse> payments) {
}
