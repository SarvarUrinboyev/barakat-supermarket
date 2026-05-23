package uz.barakat.market.dto;

import java.util.List;

/** Orders grouped for the Orders page: today / overdue / upcoming. */
public record OrdersByStatus(
        List<OrderResponse> today,
        List<OrderResponse> overdue,
        List<OrderResponse> upcoming) {
}
