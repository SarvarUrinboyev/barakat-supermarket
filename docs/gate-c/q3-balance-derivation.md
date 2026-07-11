# Q3 — Where balances come from, and the deploy-blocking inconsistency

**Answer:** balances are derived three different ways. One is safe, two corrupt
the moment a so'm-canonical credit/QARZGA sale posts after deploy.

## Derivations (file:line)

### Suppliers — SAFE (converted per-record)
`SupplierService.toResponse` sums each outgoing Payment converted to USD by that
payment's OWN currency:
```
paid = pool.stream()...map(p -> converter.toUsd(p.getAmount(), p.getCurrency())).reduce(...)
```
`SupplierService.java:111-114`. `Payment` has a `currency` column (V7), so this
is USD-canonical and unit-consistent. **No Q3 issue.**

### Customers — UNSAFE (summed rows, no currency)
`CustomerService.balanceOf` sums `CustomerTransaction.amount` raw (GOODS add,
PAYMENT subtract):
```
balance = tx.getType()==GOODS ? balance.add(tx.getAmount()) : balance.subtract(tx.getAmount());
```
`CustomerService.java:136-145`. **`CustomerTransaction` has NO currency column**
(`CustomerTransaction.java` — amount is a bare NUMERIC). Amounts are one implicit
scale. A QARZGA credit sale writes the sale's so'm-canonical total straight in:
```
tx.setAmount(nz(saved.getTotalUzs()));   // som-canonical after Gate C
```
`PosService.recordCreditSaleDebt` (`PosService.java`). Pre-Gate-C that total was
USD; post-Gate-C it is so'm — so `balanceOf` sums **USD-era and so'm-era rows
together**.

### Debtors / customer-debts — UNSAFE (summed stored amounts, no currency)
`DebtService` totals `remainingAmount` off `Debtor` / `CustomerDebt` entities,
which store bare amount fields with no currency. Manually-kept "qarz daftari"
entries are one implicit unit (USD historically); nothing tags them.

## Worked example (the corruption)

A customer with one pre-Gate-C credit purchase: a $50 phone → `CustomerTransaction`
GOODS `amount = 50`.

After deploy they buy 63 500 so'm of groceries on credit (QARZGA). POS is now
so'm-canonical, so the sale total is `63500`; `recordCreditSaleDebt` writes GOODS
`amount = 63500`.

`balanceOf` = `50 + 63500 = 63550`, rendered "**$63 550**" on the debt screen.
The customer actually owes **$50 + 63 500 so'm** (≈ $55 total). The number is
meaningless — two currencies summed as if one.

## Why AM-2 relabel does NOT fix it

AM-2 relabels rows that HAVE a currency column (`sale_items`, `sales`). The
customer/debtor tables have **no currency column to relabel**, and the amounts
are already written in mixed units — there is nothing to key a correction on.

## Why the two "obvious" interims are both wrong

- **Store the credit sale as so'm** (current behavior): mixes with USD-era rows →
  the example above.
- **Convert the credit sale to USD** (like the GL seam fix): a genuinely-so'm
  debt then floats with the kurs — a customer's so'm debt silently changes size
  as the rate moves. That is a **business-rule error** (what they owe must not
  drift), exactly the 1b/DECISION-4 concern.

The only correct model is **per-currency buckets** (dual-bucket): store the
credit transaction's amount AND its currency, sum per currency, settle per
currency, display "63 500 so'm + $50". That is Gate D.

## Recommendation (feeds DECISION-4)

1. **Minimum to make deploy safe without full Gate D:** add a `currency` column
   to `CustomerTransaction` (and the debtor/customer-debt tables), stamp each new
   row with the sale's currency (so'm for a folded so'm-canonical sale, or the
   line's native currency), backfill existing rows to `USD`, and make `balanceOf`
   group by currency. This is the *seed* of the dual-bucket model — small, and it
   stops the mixing at the source. Display can still show a single `$` figure
   interim ONLY for customers whose entries are all one currency; mixed customers
   must show the split.
2. **Full Gate D:** per-currency settlement flows + relabel/recompute of existing
   balances + the dual-bucket UI.

**Do NOT deploy so'm-canonical QARZGA credit sales until at least (1) lands**, or
the debt book starts mixing units for any customer who transacts across the
deploy boundary. If Barakat does not use customer credit day-to-day (DECISION-4
question), the urgency drops and (1) can ride with Gate D; if they do, (1) is a
pre-deploy blocker.
