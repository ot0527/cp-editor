import { load } from 'cheerio';
import { normalizeAtCoderMathInHtml } from '../../shared/mathNotation';
import type { FetchProblemDetailParams, ProblemDetail, ProblemSample, ProblemSection } from '../../shared/types/problem';
import { readCache, writeCache } from './cacheService';

/**
 * 問題詳細キャッシュキーを生成する。
 *
 * @param {FetchProblemDetailParams} params 取得対象。
 * @returns {string} キャッシュキー。
 */
function getProblemDetailCacheKey(params: FetchProblemDetailParams): string {
  return `problem_detail_${params.contestId}_${params.problemId}`;
}

/**
 * サンプル見出しからサンプル番号を抽出する。
 *
 * @param {string} heading セクション見出し。
 * @returns {number} サンプル番号。
 */
function extractSampleIndex(heading: string): number {
  const matched = heading.match(/(\d+)/);

  if (!matched) {
    return 1;
  }

  const parsed = Number(matched[1]);
  return Number.isNaN(parsed) ? 1 : parsed;
}

/**
 * AtCoderの問題HTMLからセクションとサンプルを抽出する。
 *
 * @param {string} html 取得した問題ページHTML。
 * @param {FetchProblemDetailParams} params 問題識別情報。
 * @returns {ProblemDetail} パース済み問題詳細。
 */
function parseProblemHtml(html: string, params: FetchProblemDetailParams): ProblemDetail {
  const $ = load(html);
  const taskStatement = $('#task-statement');
  const japaneseRoot = taskStatement.find('.lang-ja').first();
  const englishRoot = taskStatement.find('.lang-en').first();
  const contentRoot = japaneseRoot.length > 0 ? japaneseRoot : englishRoot.length > 0 ? englishRoot : taskStatement;

  const sectionNodes = contentRoot.find('section');
  const sections: ProblemSection[] = [];
  const sampleInputMap = new Map<number, string>();
  const sampleOutputMap = new Map<number, string>();

  sectionNodes.each((_, section) => {
    const heading = $(section).find('h3').first().text().replace(/\s+/g, ' ').trim() || 'セクション';
    const sectionClone = $(section).clone();
    sectionClone.find('h3').first().remove();

    const bodyHtmlRaw = sectionClone.html()?.trim() ?? '';
    const bodyHtml = normalizeAtCoderMathInHtml(bodyHtmlRaw);
    if (bodyHtml) {
      sections.push({
        heading,
        html: bodyHtml,
      });
    }

    const preText = $(section).find('pre').first().text().trim();
    if (!preText) {
      return;
    }

    const sampleIndex = extractSampleIndex(heading);

    if (/入力例|sample input/i.test(heading)) {
      sampleInputMap.set(sampleIndex, preText);
    }

    if (/出力例|sample output/i.test(heading)) {
      sampleOutputMap.set(sampleIndex, preText);
    }
  });

  const sampleIndexes = Array.from(new Set([...sampleInputMap.keys(), ...sampleOutputMap.keys()])).sort((a, b) => a - b);
  const samples: ProblemSample[] = sampleIndexes.map((index) => ({
    index,
    input: sampleInputMap.get(index) ?? '',
    output: sampleOutputMap.get(index) ?? '',
  }));

  if (sections.length === 0) {
    const fallbackHtmlRaw = contentRoot.html()?.trim() ?? '';
    const fallbackHtml = normalizeAtCoderMathInHtml(fallbackHtmlRaw);
    if (fallbackHtml) {
      sections.push({
        heading: '問題文',
        html: fallbackHtml,
      });
    }
  }

  return {
    problemId: params.problemId,
    contestId: params.contestId,
    title: params.title,
    url: `https://atcoder.jp/contests/${params.contestId}/tasks/${params.problemId}`,
    sections,
    samples,
  };
}

/**
 * 問題詳細を取得する。ローカルキャッシュがあれば再利用する。
 *
 * @param {FetchProblemDetailParams} params 問題識別情報。
 * @returns {Promise<ProblemDetail>} 取得した問題詳細。
 */
export async function fetchProblemDetail(params: FetchProblemDetailParams): Promise<ProblemDetail> {
  const cacheKey = getProblemDetailCacheKey(params);
  const cached = await readCache<ProblemDetail>(cacheKey);

  if (!params.forceRefresh && cached?.data) {
    return cached.data;
  }

  const url = `https://atcoder.jp/contests/${params.contestId}/tasks/${params.problemId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CPEditor/0.1.0 (Phase2)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch problem page: ${response.status}`);
  }

  const html = await response.text();
  const detail = parseProblemHtml(html, params);

  await writeCache(cacheKey, {
    updatedAt: Date.now(),
    data: detail,
  });

  return detail;
}
