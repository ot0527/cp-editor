import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface CacheEnvelope<T> {
  updatedAt: number;
  etag?: string;
  data: T;
}

interface FetchJsonWithCacheOptions {
  url: string;
  cacheKey: string;
  ttlMs: number;
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
  const cachePath = toCacheFilePath(cacheKey);

  try {
    const raw = await readFile(cachePath, 'utf8');
    return JSON.parse(raw) as CacheEnvelope<T>;
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
}

/**
 * ETag付きHTTPキャッシュを使ってJSONを取得する。
 *
 * @template T
 * @param {FetchJsonWithCacheOptions} options 取得先とキャッシュ設定。
 * @returns {Promise<T>} 取得データ。
 */
export async function fetchJsonWithCache<T>(options: FetchJsonWithCacheOptions): Promise<T> {
  const { url, cacheKey, ttlMs } = options;
  const now = Date.now();
  const cached = await readCache<T>(cacheKey);

  if (cached && now - cached.updatedAt < ttlMs) {
    return cached.data;
  }

  const headers: Record<string, string> = {};
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag;
  }

  try {
    const response = await fetch(url, { headers });

    if (response.status === 304 && cached) {
      await writeCache<T>(cacheKey, { ...cached, updatedAt: now });
      return cached.data;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} (${response.status})`);
    }

    const data = (await response.json()) as T;
    const etag = response.headers.get('etag') ?? undefined;

    await writeCache<T>(cacheKey, {
      updatedAt: now,
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
