package uz.barakat.market.domain;

/** Category of a management cost entry used in the profit calculation. */
public enum ManagementCostType {
    /** Wages paid to workers ("ishchilarga oyliklar"). */
    SALARY,
    /** Taxes ("soliqlar"). */
    TAX,
    /** Any other operating cost ("boshqa xarajatlar"). */
    OTHER
}
