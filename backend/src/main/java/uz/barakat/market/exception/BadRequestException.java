package uz.barakat.market.exception;

/** Thrown when a request is semantically invalid. Maps to HTTP 400. */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
