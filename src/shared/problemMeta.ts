import type { DifficultyBand, ProblemCategory } from './types/problem';

/** カテゴリ表示順。 */
export const CATEGORY_ORDER: ProblemCategory[] = [
  '全探索',
  '二分探索',
  '貪欲法',
  '動的計画法',
  'グラフ',
  'データ構造',
  '数学',
  '文字列',
  '未分類',
];

/** 難易度帯表示順。 */
export const DIFFICULTY_BAND_ORDER: DifficultyBand[] = ['灰', '茶', '緑', '水', '青', '黄', '橙', '赤', '不明'];

/** 難易度帯の色。 */
export const DIFFICULTY_COLOR_MAP: Record<DifficultyBand, string> = {
  灰: '#808080',
  茶: '#804000',
  緑: '#008000',
  水: '#00C0C0',
  青: '#0000FF',
  黄: '#C0C000',
  橙: '#FF8000',
  赤: '#FF0000',
  不明: '#94A3B8',
};

/**
 * 数値difficultyから帯域ラベルを算出する。
 *
 * @param {number | null | undefined} difficulty AtCoder Problems difficulty。
 * @returns {DifficultyBand} 帯域ラベル。
 */
export function toDifficultyBand(difficulty: number | null | undefined): DifficultyBand {
  if (difficulty == null || Number.isNaN(difficulty) || difficulty < 0) {
    return '不明';
  }

  if (difficulty <= 399) {
    return '灰';
  }

  if (difficulty <= 799) {
    return '茶';
  }

  if (difficulty <= 1199) {
    return '緑';
  }

  if (difficulty <= 1599) {
    return '水';
  }

  if (difficulty <= 1999) {
    return '青';
  }

  if (difficulty <= 2399) {
    return '黄';
  }

  if (difficulty <= 2799) {
    return '橙';
  }

  return '赤';
}

/**
 * 難易度帯に対応する表示色を返す。
 *
 * @param {DifficultyBand} band 難易度帯。
 * @returns {string} カラーコード。
 */
export function difficultyBandToColor(band: DifficultyBand): string {
  return DIFFICULTY_COLOR_MAP[band];
}
