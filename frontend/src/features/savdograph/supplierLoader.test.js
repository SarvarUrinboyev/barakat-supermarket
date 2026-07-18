import { describe, expect, it, vi } from 'vitest';
import { createSupplierLoader } from './supplierLoader.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('SavdoGraph supplier loading lifecycle', () => {
  it('starts in loading and finishes settled with safe supplier fields', async () => {
    const response = deferred();
    const fetchSuppliers = vi.fn(() => response.promise);
    const loader = createSupplierLoader(fetchSuppliers);

    const pending = loader.load();
    expect(loader.state).toBe('loading');
    response.resolve([{ id: 31, name: 'Demo Supplier', phone: 'must-not-flow-to-bridge' }]);

    await expect(pending).resolves.toEqual([{ id: 31, name: 'Demo Supplier' }]);
    expect(loader.state).toBe('settled');
    expect(fetchSuppliers).toHaveBeenCalledTimes(1);
  });

  it('settles safely when the backend returns an empty or malformed list', async () => {
    const empty = createSupplierLoader(async () => []);
    await expect(empty.load()).resolves.toEqual([]);
    expect(empty.state).toBe('settled');

    const malformed = createSupplierLoader(async () => ({ items: [] }));
    await expect(malformed.load()).resolves.toEqual([]);
    expect(malformed.state).toBe('settled');
  });

  it('settles after an error without retrying on repeated renders', async () => {
    const fetchSuppliers = vi.fn(async () => { throw new Error('unavailable'); });
    const loader = createSupplierLoader(fetchSuppliers);

    await expect(loader.load()).rejects.toThrow('unavailable');
    expect(loader.state).toBe('settled');
    await expect(loader.load()).rejects.toThrow('unavailable');
    expect(fetchSuppliers).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight request across repeated renders', async () => {
    const response = deferred();
    const fetchSuppliers = vi.fn(() => response.promise);
    const loader = createSupplierLoader(fetchSuppliers);

    const first = loader.load();
    const repeated = loader.load();
    expect(repeated).toBe(first);
    expect(fetchSuppliers).toHaveBeenCalledTimes(0);

    await Promise.resolve();
    expect(fetchSuppliers).toHaveBeenCalledTimes(1);
    response.resolve([{ id: 31, name: 'Demo Supplier' }]);
    await expect(first).resolves.toEqual([{ id: 31, name: 'Demo Supplier' }]);
    expect(fetchSuppliers).toHaveBeenCalledTimes(1);
  });
});
