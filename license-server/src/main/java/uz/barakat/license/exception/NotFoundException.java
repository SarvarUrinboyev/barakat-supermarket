package uz.barakat.license.exception;

/** Thrown when a requested record does not exist. Maps to HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String entity, Long id) {
        return new NotFoundException(entity + " topilmadi (id=" + id + ")");
    }
}
