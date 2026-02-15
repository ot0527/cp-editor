import categoryMapping from '../../data/categoryMapping.json';
import { CATEGORY_ORDER, difficultyBandToColor, toDifficultyBand } from '../../shared/problemMeta';
import type { ProblemCategory, ProblemIndexItem } from '../../shared/types/problem';
import { fetchJsonWithCache } from './cacheService';

const ATCODER_PROBLEMS_BASE_URL = 'https://kenkoooo.com/atcoder/resources';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface AtCoderProblemRecord {
  id: string;
  contest_id: string;
  title?: string;
  name?: string;
}

interface AtCoderProblemModel {
  difficulty?: number;
}

type AtCoderProblemModelMap = Record<string, AtCoderProblemModel>;

let lastAtCoderRequestAt = 0;

const categorySet = new Set<ProblemCategory>(CATEGORY_ORDER);

/**
 * AtCoder API呼び出し間隔を最低1秒に保つ。
 *
 * @returns {Promise<void>} 値は返さない。
 */
async function throttleAtCoderRequest(): Promise<void> {
  const elapsed = Date.now() - lastAtCoderRequestAt;
  const waitMs = Math.max(0, 1000 - elapsed);

  if (waitMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), waitMs);
    });
  }

  lastAtCoderRequestAt = Date.now();
}

/**
 * カテゴリ文字列を定義済みカテゴリへ正規化する。
 *
 * @param {string | undefined} rawCategory 入力カテゴリ。
 * @returns {ProblemCategory} 正規化済みカテゴリ。
 */
function normalizeCategory(rawCategory: string | undefined): ProblemCategory {
  if (!rawCategory) {
    return '未分類';
  }

  if (categorySet.has(rawCategory as ProblemCategory)) {
    return rawCategory as ProblemCategory;
  }

  return '未分類';
}

/**
 * 問題ID・タイトルからカテゴリを推定する。
 *
 * @param {string} problemId 問題ID。
 * @param {string} title 問題タイトル。
 * @returns {ProblemCategory} 推定カテゴリ。
 */
function inferCategory(problemId: string, title: string): ProblemCategory {
  const mapped = normalizeCategory((categoryMapping as Record<string, string>)[problemId]);
  if (mapped !== '未分類') {
    return mapped;
  }

  const normalized = `${problemId} ${title}`.toLowerCase();

  if (/\bdp\b|dynamic programming|ナップサック/.test(normalized)) {
    return '動的計画法';
  }

  if (/binary search|\bbisect\b|lower_bound|upper_bound|二分探索/.test(normalized)) {
    return '二分探索';
  }

  if (/graph|tree|path|bfs|dfs|dijkstra|shortest|最短|木|グラフ/.test(normalized)) {
    return 'グラフ';
  }

  if (/segment tree|fenwick|bit|union[- ]?find|priority queue|heap|stack|queue/.test(normalized)) {
    return 'データ構造';
  }

  if (/gcd|lcm|prime|mod|math|整数|数論|行列|combin/.test(normalized)) {
    return '数学';
  }

  if (/string|substring|palindrome|z-algorithm|suffix|文字列/.test(normalized)) {
    return '文字列';
  }

  if (/greedy|貪欲/.test(normalized)) {
    return '貪欲法';
  }

  if (/brute|enumerate|all patterns|全探索|for each/.test(normalized)) {
    return '全探索';
  }

  return '未分類';
}

/**
 * AtCoder Problems APIから問題一覧と難易度を取得し、UI向け形式へ変換する。
 *
 * @returns {Promise<ProblemIndexItem[]>} 問題一覧。
 */
export async function fetchProblemIndex(): Promise<ProblemIndexItem[]> {
  await throttleAtCoderRequest();
  const problems = await fetchJsonWithCache<AtCoderProblemRecord[]>({
    url: `${ATCODER_PROBLEMS_BASE_URL}/problems.json`,
    cacheKey: 'atcoder_problems',
    ttlMs: ONE_DAY_MS,
  });

  await throttleAtCoderRequest();
  const models = await fetchJsonWithCache<AtCoderProblemModelMap>({
    url: `${ATCODER_PROBLEMS_BASE_URL}/problem-models.json`,
    cacheKey: 'atcoder_problem_models',
    ttlMs: ONE_DAY_MS,
  });

  return problems
    .filter((problem) => problem.id && problem.contest_id)
    .map((problem) => {
      const title = problem.title ?? problem.name ?? problem.id;
      const difficultyValue = models[problem.id]?.difficulty;
      const difficulty = Number.isFinite(difficultyValue) ? (difficultyValue as number) : null;
      const difficultyBand = toDifficultyBand(difficulty);

      return {
        id: problem.id,
        contestId: problem.contest_id,
        title,
        difficulty,
        difficultyBand,
        difficultyColor: difficultyBandToColor(difficultyBand),
        category: inferCategory(problem.id, title),
      } satisfies ProblemIndexItem;
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}
