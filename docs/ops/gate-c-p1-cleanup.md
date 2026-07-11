# Gate C — prod data hygiene runbook (AM-1, AM-2, AM-4)

Read-only checks first, then optional reversible cleanup. **Nothing here runs
automatically** — the V38 migration deliberately hard-codes no prod shop id.
Run on the prod box once SSH is restored (blocked as of 2026-07-11) and after
Sirojiddin confirms who ran `warehouse_import.py` and against which shop.

Connect (documented): `ssh -i ~/.ssh/savdopro_vps root@168.119.64.239` then
`sudo -u postgres psql -d barakat`.

---

## 1. AM-1 — re-establish the counts (all prior numbers are UNVERIFIED)

Every population figure in the Gate C plan came from `migration-handoff/current-production-snapshot.md`, an OLD-prod artifact (2026-07-01), **not a live query**. Re-establish live:

```sql
-- per-shop product counts (which shop is the operational one? which is P1?)
SELECT s.id, s.name, s.is_main, count(p.id) AS products
FROM shops s LEFT JOIN products p ON p.shop_id = s.id
GROUP BY s.id, s.name, s.is_main
ORDER BY products DESC;

-- currency split V38 produced, per shop
SELECT shop_id, currency, count(*)
FROM products GROUP BY shop_id, currency ORDER BY shop_id, currency;
```

Expected on the OPERATIONAL shop: ~70 USD (hand-created) + ~6109 UZS (UI import).
If a shop shows a large all-USD block, that is the **P1 script import** mislabeled
by V38 (P1 went through POST /products, indistinguishable from hand entry — see
the V38 header). Decide its fate in §3.

## 2. AM-2 — quantify before trusting relabeled sale history

V38 relabelled sale lines to their product's population currency (deleted-product
lines kept USD). Confirm the blast radius before relying on past reports:

```sql
-- sale lines now tagged UZS (were они really som sales?) since the import date
SELECT count(*) FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE si.currency = 'UZS' AND s.created_at >= DATE '2026-07-11';

-- ambiguous: lines whose product was deleted (kept the USD default)
SELECT count(*) FROM sale_items WHERE product_id IS NULL;
```

If the ambiguous count is non-zero and material, review those sales by hand
before quoting historical profit; the going-forward POS is already correct.

## 3. AM-4 — dispose or relabel the P1 script-import shop (reversible)

Only after §1 identifies the P1 shop id (call it `:p1`) AND Sirojiddin confirms
it is not operationally used.

```sql
-- GATE: is any sale line tied to P1's products? If > 0, DO NOT DELETE.
SELECT count(*) FROM sale_items si
JOIN products p ON p.id = si.product_id
WHERE p.shop_id = :p1;
```

- **If 0 sale references** → archive then delete (reversible via the dump):
  ```bash
  pg_dump -d barakat -t products --data-only \
    --where="shop_id=:p1" > /root/p1_products_archive_$(date +%F).sql   # run in shell, fill :p1
  ```
  ```sql
  DELETE FROM stock_movements WHERE product_id IN (SELECT id FROM products WHERE shop_id = :p1);
  DELETE FROM products WHERE shop_id = :p1;
  -- optionally: DELETE FROM shops WHERE id = :p1;  (only if the shop itself is unused)
  ```

- **If sales reference it** → keep the rows, just correct the currency (P1 prices
  are som, V38 mislabeled them USD):
  ```sql
  UPDATE products SET currency = 'UZS' WHERE shop_id = :p1;
  -- and its historical sale lines, to match:
  UPDATE sale_items SET currency = 'UZS'
  WHERE product_id IN (SELECT id FROM products WHERE shop_id = :p1);
  ```

## 3b. EXT-1 — correct customer-ledger rows the OLD code wrote as so'm

The pre-Gate-C code already wrote raw sale totals into `customer_transactions`
(no currency column then). Any QARZGA sale of an imported (som-semantic) product
since import day wrote a so'm number that V40 backfilled to `USD` — wrong. Find
and correct them (run after V40):

Only a **pure-so'm** credit sale is safe to relabel. A pre-Gate-C **mixed** cart
(some USD-priced, some so'm-priced lines) stored one blended total — neither
label is honest, so those go to a review worklist, never guessed.

```sql
-- RELABEL: only credit-sale rows whose linked sale is UZS AND has NO USD line.
UPDATE customer_transactions ct SET currency = 'UZS'
WHERE ct.description LIKE 'POS qarz sotuvi #%'
  AND ct.created_at >= DATE '2026-07-11'
  AND ct.currency = 'USD'
  AND EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = CAST(regexp_replace(ct.description, '[^0-9]', '', 'g') AS BIGINT)
          AND s.currency = 'UZS'
          AND NOT EXISTS (SELECT 1 FROM sale_items si
                          WHERE si.sale_id = s.id AND si.currency = 'USD'));

-- WORKLIST: everything the relabel deliberately skipped — mixed-currency sales
-- (a USD line present) or an unresolvable / deleted sale. Review by hand.
SELECT ct.id, ct.customer_id, ct.amount, ct.description
FROM customer_transactions ct
WHERE ct.description LIKE 'POS qarz sotuvi #%'
  AND ct.created_at >= DATE '2026-07-11'
  AND ct.currency = 'USD'
  AND NOT EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = CAST(regexp_replace(ct.description, '[^0-9]', '', 'g') AS BIGINT)
          AND s.currency = 'UZS'
          AND NOT EXISTS (SELECT 1 FROM sale_items si
                          WHERE si.sale_id = s.id AND si.currency = 'USD'));
```
The relabel and the worklist are exact complements (over the same candidate set),
so every suspect row is either corrected or surfaced — none silently left wrong.
Rehearsed by `CustomerLedgerRelabelIT`.

## 4. After any change — re-verify

```sql
SELECT shop_id, currency, count(*) FROM products GROUP BY shop_id, currency;
```

Report the before/after counts back into the Gate C thread. No app restart is
needed; currency is read live on the next request.

## 5. SoldGoods USD-era exposure (AM-10)

The sold-goods export (Management page) tags the whole report so'm-canonical
(post-Gate-C SALE movement snapshots are so'm). Sales of dollar-priced products
made BEFORE the deploy stored genuine USD snapshots, so over that history the
report labels them "so'm". A StockMovement has no currency column and no clean
link to its sale_item, so a correct per-line source needs a schema change (a
later gate). Meanwhile, QUANTIFY the exposure so it is known, not silent —
`:deploy_day` = the Gate C deploy date:

```sql
-- How many pre-deploy SALE movements price a now-USD product (rows the report
-- would print as "so'm" but which hold dollar-magnitude snapshots).
SELECT count(*) AS usd_era_sold_goods_rows
FROM stock_movements m
JOIN products p ON p.id = m.product_id
WHERE m.reason = 'SALE'
  AND p.currency = 'USD'
  AND m.created_at < DATE :deploy_day;
```

If the count is 0 (a shop that never sold a USD product before deploy — the
common all-so'm case), the report is exactly correct and there is nothing to do.
If non-zero, note it against any historical sold-goods figures until the
stock-movement currency column lands.
