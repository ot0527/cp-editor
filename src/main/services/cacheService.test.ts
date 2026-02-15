import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_USER_DATA_DIR = '/tmp/cpeditor-vitest-cache';

vi.mock('electron', () => ({
  app: {
    getPath: () => TEST_USER_DATA_DIR,
  },
}));

import { fetchJsonWithCache, writeCache } from './cacheService';

/**
 * テストごとに重複しないキャッシュキーを生成する。
 *
 * @param {string} prefix 接頭辞。
 * @returns {string} 一意なキャッシュキー。
 */
function createCacheKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * テスト用キャッシュディレクトリを削除する。
 *
 * @returns {Promise<void>} 値は返さない。
 */
async function clearTestCacheDirectory(): Promise<void> {
  await rm(join(TEST_USER_DATA_DIR, 'cache'), { recursive: true, force: true });
}

describe('fetchJsonWithCache', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await clearTestCacheDirectory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('returns fresh cache without network access', async () => {
    const cacheKey = createCacheKey('fresh');
    const cachedData = { source: 'cache' };
    await writeCache(cacheKey, {
      updatedAt: Date.now(),
      data: cachedData,
    });

    const fetchMock = vi.fn();
    const beforeNetwork = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchJsonWithCache<typeof cachedData>({
      url: 'https://example.com/fresh',
      cacheKey,
      ttlMs: 60_000,
      onBeforeNetworkFetch: beforeNetwork,
    });

    expect(result).toEqual(cachedData);
    expect(beforeNetwork).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent requests for the same cache key', async () => {
    const cacheKey = createCacheKey('inflight');
    const responseBody = { value: 42 };
    const beforeNetwork = vi.fn();
    const fetchMock = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 20);
      });

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          etag: '"v1"',
        },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const request = {
      url: 'https://example.com/inflight',
      cacheKey,
      ttlMs: 1,
      onBeforeNetworkFetch: beforeNetwork,
    };

    const [first, second] = await Promise.all([
      fetchJsonWithCache<typeof responseBody>(request),
      fetchJsonWithCache<typeof responseBody>(request),
    ]);

    expect(first).toEqual(responseBody);
    expect(second).toEqual(responseBody);
    expect(beforeNetwork).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to stale cache when network fetch fails', async () => {
    const cacheKey = createCacheKey('stale');
    const staleData = { source: 'stale' };
    await writeCache(cacheKey, {
      updatedAt: Date.now() - 120_000,
      data: staleData,
    });

    const beforeNetwork = vi.fn();
    const fetchMock = vi.fn(async () => {
      throw new Error('network failure');
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchJsonWithCache<typeof staleData>({
      url: 'https://example.com/stale',
      cacheKey,
      ttlMs: 1,
      onBeforeNetworkFetch: beforeNetwork,
    });

    expect(result).toEqual(staleData);
    expect(beforeNetwork).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
