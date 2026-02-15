/** 問題カテゴリ一覧。 */
export type ProblemCategory =
  | '全探索'
  | '二分探索'
  | '貪欲法'
  | '動的計画法'
  | 'グラフ'
  | 'データ構造'
  | '数学'
  | '文字列'
  | '未分類';

/** AtCoder Problems difficulty を帯域化したラベル。 */
export type DifficultyBand = '灰' | '茶' | '緑' | '水' | '青' | '黄' | '橙' | '赤' | '不明';

/** サイドバー表示用の問題メタ情報。 */
export interface ProblemIndexItem {
  id: string;
  contestId: string;
  title: string;
  difficulty: number | null;
  difficultyBand: DifficultyBand;
  difficultyColor: string;
  category: ProblemCategory;
}

/** 問題文の1セクション。 */
export interface ProblemSection {
  heading: string;
  html: string;
}

/** 入出力サンプル1件。 */
export interface ProblemSample {
  index: number;
  input: string;
  output: string;
}

/** 問題詳細。 */
export interface ProblemDetail {
  problemId: string;
  contestId: string;
  title: string;
  url: string;
  sections: ProblemSection[];
  samples: ProblemSample[];
}

/** 問題詳細取得リクエスト。 */
export interface FetchProblemDetailParams {
  contestId: string;
  problemId: string;
  title: string;
  forceRefresh?: boolean;
}
