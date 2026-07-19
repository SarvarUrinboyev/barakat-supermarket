import { afterEach, describe, expect, it, vi } from 'vitest';

async function demoFlag(value) {
  vi.stubEnv('VITE_DEMO_DATA', value);
  vi.resetModules();
  return (await import('./config.js')).IS_DEMO_DATA;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('demo-data build flag', () => {
  it('enables demo labeling only for an explicit true value', async () => {
    expect(await demoFlag('true')).toBe(true);
  });

  it('keeps demo labeling disabled for an explicit false value', async () => {
    expect(await demoFlag('false')).toBe(false);
  });
});
