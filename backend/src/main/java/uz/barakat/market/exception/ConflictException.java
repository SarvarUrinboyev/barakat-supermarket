package uz.barakat.market.exception;

/** Thrown when a request conflicts with an already-final SavdoGraph decision. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
