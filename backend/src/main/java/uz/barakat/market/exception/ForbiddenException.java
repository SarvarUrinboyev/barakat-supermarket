package uz.barakat.market.exception;

/** Thrown after an auditable SavdoGraph authorization denial. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
