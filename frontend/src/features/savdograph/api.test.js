import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavdoGraphApi } from '../../api/endpoints.js';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function response(body = {}) {
  return {
    status: 200,
    ok: true,
    text: async () => JSON.stringify(body),
    clone() { return response(body); },
  };
}

describe('SavdoGraph API client contract', () => {
  beforeEach(() => {
    globalThis.localStorage = storage();
    globalThis.fetch = vi.fn(async () => response({ ok: true }));
  });

  it('posts the B3.5 bridge to the backend analysisRunId with only numeric supplierId', async () => {
    await SavdoGraphApi.createProposalFromSimulation(601, { supplierId: 31 });
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/savdograph/reorder-simulations/601/proposals');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ supplierId: 31 });
  });

  it('posts the exact Gross Profit Brief period body', async () => {
    await SavdoGraphApi.createGrossProfitBrief({ periodStart: '2026-07-18', periodEnd: '2026-07-19' });
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/savdograph/gross-profit-briefs');
    expect(JSON.parse(options.body)).toEqual({ periodStart: '2026-07-18', periodEnd: '2026-07-19' });
  });

  it('posts only the committed owner decision body to approve', async () => {
    await SavdoGraphApi.approveProposal(701, { reason: null, idempotencyKey: 'stable-key' });
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/savdograph/proposals/701/approve');
    expect(JSON.parse(options.body)).toEqual({ reason: null, idempotencyKey: 'stable-key' });
  });

  it('retrieves evidence without a request body', async () => {
    await SavdoGraphApi.evidence(101);
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/savdograph/evidence-items/101');
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
  });

  it('reuses authenticated client tenant headers instead of accepting authority in the DTO', async () => {
    localStorage.setItem('savdopro.token', 'test-token');
    localStorage.setItem('savdopro.activeShopId', '44');
    await SavdoGraphApi.actionLedger();
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(options.headers['X-Shop-Id']).toBe('44');
  });
});
