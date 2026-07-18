package uz.barakat.market.domain;

/**
 * Distinguishes a checkout-time cost snapshot from historical rows whose V37
 * backfill cannot prove the original transaction-time cost.
 */
public enum CostSnapshotProvenance {
    TRANSACTION_TIME,
    LEGACY_OR_UNKNOWN
}
