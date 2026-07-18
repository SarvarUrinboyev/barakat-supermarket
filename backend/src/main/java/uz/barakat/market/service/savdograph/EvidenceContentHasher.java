package uz.barakat.market.service.savdograph;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import uz.barakat.market.domain.EvidenceItem;

/**
 * Canonical B1.1 integrity hash for every business-significant evidence field.
 * The length-prefixed representation prevents delimiter ambiguity; it purposely
 * excludes only the generated id and audit timestamp, neither of which changes
 * the calculation's business meaning.
 */
public final class EvidenceContentHasher {

    public static final String HASH_VERSION = "B1_CANONICAL_V1";

    private EvidenceContentHasher() {
    }

    public static String hash(EvidenceItem item) {
        return sha256(String.join("",
                field(HASH_VERSION),
                field(item.getShopId()),
                field(item.getAnalysisRunId()),
                field(item.getProductId()),
                field(item.getEvidenceType()),
                field(item.getSourceType()),
                field(item.getPeriodFrom()),
                field(item.getPeriodTo()),
                field(item.getCalculationId()),
                field(item.getCalculationVersion()),
                field(item.getInputData()),
                field(item.getCalculatedResult()),
                field(item.getUnit()),
                field(item.getCurrency())));
    }

    public static boolean isCanonicalAndValid(EvidenceItem item) {
        return HASH_VERSION.equals(item.getHashVersion())
                && hash(item).equals(item.getContentHash());
    }

    private static String field(Object value) {
        String text;
        if (value instanceof BigDecimal amount) {
            text = amount.signum() == 0 ? "0" : amount.stripTrailingZeros().toPlainString();
        } else {
            text = value == null ? "<null>" : value.toString();
        }
        return text.length() + ":" + text;
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 mavjud emas", ex);
        }
    }
}
