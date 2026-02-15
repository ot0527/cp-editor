import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface CacheEnvelope<T> {
  updatedAt: number;
  etag?: string;
  data: T;
}

interface FetchJsonWithCacheOptions {
  url: string;
  cacheKey: string;
  ttlMs: number;
  onBeforeNetworkFetch?: () => Promise<void> | void;
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const inFlightFetches = new Map<string, Promise<unknown>>();
const MAX_MEMORY_CACHE_ENTRIES = 256;

/**
 * メモリキャッシュへ保存し、上限超過時は古い項目を削除する。
 *
 * @param {string} cacheKey キャッシュ識別子。
 * @param {CacheEnvelope<unknown>} envelope 保存対象。
 * @returns {void} 値は返さない。
 */
function setMemoryCache(cacheKey: string, envelope: CacheEnvelope<unknown>): void {
  if (memoryCache.has(cacheKey)) {
    memoryCache.delete(cacheKey);
  }

  memoryCache.set(cacheKey, envelope);

  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey == null) {
      break;
    }

    memoryCache.delete(oldestKey);
  }
}

/**
 * 同時実行中フェッチの識別キーを生成する。
 *
 * @param {FetchJsonWithCacheOptions} options フェッチ設定。
 * @returns {string} 識別キー。
 */
function toInFlightKey(options: FetchJsonWithCacheOptions): string {
  return `${options.cacheKey}::${options.url}`;
}

/**
 * unknown値がキャッシュエンベロープ形式か検証する。
 *
 * @template T
 * @param {unknown} value 判定対象。
 * @returns {value is CacheEnvelope<T>} キャッシュ形式ならtrue。
 */
function isCacheEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CacheEnvelope<T>>;
  return Number.isFinite(candidate.updatedAt) && 'data' in candidate;
}

/**
 * キャッシュディレクトリの絶対パスを返す。
 *
 * @returns {string} キャッシュディレクトリ。
 */
function getCacheDirectoryPath(): string {
  return join(app.getPath('userData'), 'cache');
}

/**
 * キャッシュキーから保存先ファイルパスを生成する。
 *
 * @param {string} cacheKey キャッシュ識別子。
 * @returns {string} JSONキャッシュファイルパス。
 */
function toCacheFilePath(cacheKey: string): string {
  const safeName = cacheKey.replace(/[^a-zA-Z0-9-_]/g, '_');
  return join(getCacheDirectoryPath(), `${safeName}.json`);
}

/**
 * キャッシュファイルを読み込む。
 *
 * @template T
 * @param {string} cacheKey キャッシュ識別子。
 * @returns {Promise<CacheEnvelope<T> | null>} キャッシュ内容。存在しない場合はnull。
 */
export async function readCache<T>(cacheKey: string): Promise<CacheEnvelope<T> | null> {
  const inMemory = memoryCache.get(cacheKey);
  if (inMemory) {
    return inMemory as CacheEnvelope<T>;
  }

  const cachePath = toCacheFilePath(cacheKey);

  try {
    const raw = await readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isCacheEnvelope<T>(parsed)) {
      return null;
    }

    setMemoryCache(cacheKey, parsed as CacheEnvelope<unknown>);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * キャッシュファイルへ保存する。
 *
 * @template T
 * @param {string} cacheKey キャッシュ識別子。
 * @param {CacheEnvelope<T>} envelope 保存内容。
 * @returns {Promise<void>} 値は返さない。
 */
export async function writeCache<T>(cacheKey: string, envelope: CacheEnvelope<T>): Promise<void> {
  const cacheDirectory = getCacheDirectoryPath();
  const cachePath = toCacheFilePath(cacheKey);

  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(cachePath, JSON.stringify(envelope, null, 2), 'utf8');
  setMemoryCache(cacheKey, envelope as CacheEnvelope<unknown>);
}

/**
 * キャッシュがTTL内かを判定する。
 *
 * @template T
 * @param {CacheEnvelope<T> | null} cache 判定対象キャッシュ。
 * @param {number} now 判定時刻。
 * @param {number} ttlMs TTL（ミリ秒）。
 * @returns {boolean} TTL内ならtrue。
 */
function isCacheFresh<T>(cache: CacheEnvelope<T> | null, now: number, ttlMs: number): boolean {
  if (!cache) {
    return false;
  }

  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    return false;
  }

  return now - cache.updatedAt < ttlMs;
}

/**
 * キャッシュ付きJSON取得の内部処理。
 *
 * @template T
 * @param {FetchJsonWithCacheOptions} options 取得先とキャッシュ設定。
 * @returns {Promise<T>} 取得データ。
 */
async function fetchJsonWithCacheInternal<T>(options: FetchJsonWithCacheOptions): Promise<T> {
  const { url, cacheKey, ttlMs, onBeforeNetworkFetch } = options;
  const now = Date.now();
  const cached = await readCache<T>(cacheKey);

  if (cached && isCacheFresh(cached, now, ttlMs)) {
    return cached.data;
  }

  const headers: Record<string, string> = {};
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag;
  }

  try {
    await onBeforeNetworkFetch?.();
    const response = await fetch(url, { headers });

    if (response.status === 304 && cached) {
      await writeCache<T>(cacheKey, {
        ...cached,
        updatedAt: Date.now(),
      });
      return cached.data;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} (${response.status})`);
    }

    const data = (await response.json()) as T;
    const etag = response.headers.get('etag') ?? undefined;

    await writeCache<T>(cacheKey, {
      updatedAt: Date.now(),
      etag,
      data,
    });

    return data;
  } catch (error) {
    if (cached) {
      return cached.data;
    }

    throw error;
  }
}

/**
 * ETag付きHTTPキャッシュを使ってJSONを取得する。
 *
 * @template T
 * @param {FetchJsonWithCacheOptions} options 取得先とキャッシュ設定。
 * @returns {Promise<T>} 取得データ。
 */
export async function fetchJsonWithCache<T>(options: FetchJsonWithCacheOptions): Promise<T> {
  const inFlightKey = toInFlightKey(options);
  const existing = inFlightFetches.get(inFlightKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const next = fetchJsonWithCacheInternal<T>(options);
  inFlightFetches.set(inFlightKey, next as Promise<unknown>);

  try {
    return await next;
  } finally {
    inFlightFetches.delete(inFlightKey);
  }
}
