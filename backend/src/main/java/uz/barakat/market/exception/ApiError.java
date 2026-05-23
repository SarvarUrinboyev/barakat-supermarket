package uz.barakat.market.exception;

import java.time.LocalDateTime;
import java.util.Map;

/** Standard JSON error body returned by the API. */
public record ApiError(
        int status,
        String error,
        String message,
        String path,
        LocalDateTime timestamp,
        Map<String, String> fieldErrors) {
}
