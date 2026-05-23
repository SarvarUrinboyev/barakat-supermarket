package uz.barakat.market.dto;

import java.util.List;

/** A customer together with the full ledger. */
public record CustomerDetailResponse(
        CustomerResponse customer,
        List<CustomerTransactionResponse> transactions) {
}
