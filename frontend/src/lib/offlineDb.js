// IndexedDB schema for the offline POS queue.
//
// Two object stores:
//   - products  — last-known catalog snapshot, refreshed on every online
//                 ProductApi.list() call. Read-only at the POS.
//   - queue     — pending checkout requests that couldn't reach the
//                 backend. Drained by the sync worker once connectivity
//                 returns; each row is keyed by a client-generated UUID
//                 so a duplicate flush doesn't book the sale twice.
//
// Dexie wraps IndexedDB with a clean Promise API and handles schema
// migrations automatically — bumping the .version() preserves data.

import Dexie from 'dexie';

export const offlineDb = new Dexie('savdopro.offline');

offlineDb.version(1).stores({
  // [+id] auto-increment; barcode index for the POS lookup.
  products: '++id, barcode, name, quantity, updatedAt',
  // [&id] unique client-generated UUID; status indexed for the
  // sync worker's "WHERE status = 'pending'" query.
  queue: '&id, status, createdAt',
});

/** Persist (or replace) the product catalog snapshot. */
export async function cacheProducts(list) {
  if (!Array.isArray(list)) return;
  const now = Date.now();
  await offlineDb.transaction('rw', offlineDb.products, async () => {
    await offlineDb.products.clear();
    await offlineDb.products.bulkAdd(list.map((p) => ({
      ...p, updatedAt: now,
    })));
  });
}

/** Read the cached product list. Returns [] when nothing is cached. */
export async function getCachedProducts() {
  return offlineDb.products.toArray();
}

/** Enqueue a checkout payload to flush when connectivity returns. */
export async function enqueueCheckout(payload) {
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await offlineDb.queue.add({
    id,
    status: 'pending',
    payload,
    createdAt: Date.now(),
    lastTriedAt: null,
    lastError: null,
  });
  return id;
}

export async function pendingCount() {
  return offlineDb.queue.where('status').equals('pending').count();
}

export async function listPending() {
  return offlineDb.queue.where('status').equals('pending').toArray();
}

export async function markSynced(id) {
  await offlineDb.queue.update(id, { status: 'synced', syncedAt: Date.now() });
}

export async function markFailed(id, error) {
  await offlineDb.queue.update(id, {
    lastTriedAt: Date.now(),
    lastError: String(error?.message || error || 'unknown'),
  });
}

/** Periodically retry every pending checkout. Returns # successfully flushed. */
export async function flushQueue(checkoutFn) {
  const pending = await listPending();
  let ok = 0;
  for (const row of pending) {
    try {
      await checkoutFn(row.payload);
      await markSynced(row.id);
      ok++;
    } catch (err) {
      await markFailed(row.id, err);
    }
  }
  return ok;
}
