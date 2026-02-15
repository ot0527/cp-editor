import { create } from 'zustand';

export type ComplexityVerdict = 'safe' | 'borderline' | 'unsafe';

export interface ComplexityVariable {
  id: string;
  name: string;
  value: string;
}

export interface ComplexityPreset {
  id: string;
  label: string;
  evaluate: (variables: Record<string, number>) => number;
}

export interface ComplexityCheckResult {
  presetLabel: string;
  estimatedOps: number;
  limitOps: number;
  verdict: ComplexityVerdict;
  verdictLabel: string;
}

interface ComplexityStoreState {
  variables: ComplexityVariable[];
  selectedPresetId: string;
  timeLimitSec: string;
  lastResult: ComplexityCheckResult | null;
  statusSummary: string;
}

interface ComplexityStoreActions {
  setSelectedPresetId: (presetId: string) => void;
  setTimeLimitSec: (value: string) => void;
  setVariableName: (variableId: string, name: string) => void;
  setVariableValue: (variableId: string, value: string) => void;
  addVariable: () => void;
  removeVariable: (variableId: string) => void;
  runCheck: () => ComplexityCheckResult;
}

type ComplexityStore = ComplexityStoreState & ComplexityStoreActions;

let variableSequence = 3;

/**
 * 入力値を0以上の数値へ正規化する。
 *
 * @param {string | number | undefined} value 入力値。
 * @returns {number} 0以上の有限数。
 */
function toPositiveNumber(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

/**
 * O(N!)計算用に階乗を求める。
 * 171!を超えるとInfinity扱いにする。
 *
 * @param {number} n N値。
 * @returns {number} 階乗値。
 */
function factorial(n: number): number {
  const safe = Math.floor(toPositiveNumber(n));
  if (safe > 170) {
    return Number.POSITIVE_INFINITY;
  }

  let result = 1;
  for (let index = 2; index <= safe; index += 1) {
    result *= index;
  }
  return result;
}

/**
 * 0以下を防いだlog2を返す。
 *
 * @param {number} value 入力値。
 * @returns {number} log2値。
 */
function safeLog2(value: number): number {
  return Math.log2(Math.max(1, toPositiveNumber(value)));
}

/**
 * 演算回数を表示向け文字列へ整形する。
 *
 * @param {number} count 演算回数。
 * @returns {string} 表示文字列。
 */
export function formatOperationCount(count: number): string {
  if (!Number.isFinite(count)) {
    return 'Infinity';
  }

  const absolute = Math.abs(count);
  if (absolute >= 1_000_000 || (absolute > 0 && absolute < 0.01)) {
    const [mantissa, exponent] = count.toExponential(1).split('e');
    return `${mantissa}x10^${Number(exponent)}`;
  }

  if (absolute >= 1_000) {
    return Math.round(count).toLocaleString('en-US');
  }

  return Number(count.toFixed(2)).toString();
}

/**
 * UIで選択可能な計算量プリセット定義。
 */
export const COMPLEXITY_PRESETS: ComplexityPreset[] = [
  { id: 'O1', label: 'O(1)', evaluate: () => 1 },
  { id: 'O_LOG_N', label: 'O(log N)', evaluate: (v) => safeLog2(v.N) },
  { id: 'O_SQRT_N', label: 'O(√N)', evaluate: (v) => Math.sqrt(toPositiveNumber(v.N)) },
  { id: 'O_N', label: 'O(N)', evaluate: (v) => toPositiveNumber(v.N) },
  { id: 'O_N_LOG_N', label: 'O(N log N)', evaluate: (v) => toPositiveNumber(v.N) * safeLog2(v.N) },
  { id: 'O_N_SQRT_N', label: 'O(N√N)', evaluate: (v) => toPositiveNumber(v.N) * Math.sqrt(toPositiveNumber(v.N)) },
  { id: 'O_N2', label: 'O(N²)', evaluate: (v) => toPositiveNumber(v.N) ** 2 },
  { id: 'O_N2_LOG_N', label: 'O(N² log N)', evaluate: (v) => (toPositiveNumber(v.N) ** 2) * safeLog2(v.N) },
  { id: 'O_N3', label: 'O(N³)', evaluate: (v) => toPositiveNumber(v.N) ** 3 },
  { id: 'O_2N', label: 'O(2^N)', evaluate: (v) => 2 ** toPositiveNumber(v.N) },
  { id: 'O_N_2N', label: 'O(N × 2^N)', evaluate: (v) => toPositiveNumber(v.N) * 2 ** toPositiveNumber(v.N) },
  { id: 'O_N_FACT', label: 'O(N!)', evaluate: (v) => factorial(v.N) },
  { id: 'O_N_M', label: 'O(N × M)', evaluate: (v) => toPositiveNumber(v.N) * toPositiveNumber(v.M) },
  {
    id: 'O_N_M_LOG_NM',
    label: 'O(N × M × log(N+M))',
    evaluate: (v) => toPositiveNumber(v.N) * toPositiveNumber(v.M) * safeLog2(toPositiveNumber(v.N) + toPositiveNumber(v.M)),
  },
];

/**
 * 入力変数配列を評価用マップへ変換する。
 *
 * @param {ComplexityVariable[]} variables 変数入力。
 * @returns {Record<string, number>} 変数マップ。
 */
function toVariableMap(variables: ComplexityVariable[]): Record<string, number> {
  const mapped: Record<string, number> = {};

  for (const variable of variables) {
    const normalizedName = variable.name.trim().toUpperCase();
    if (!normalizedName) {
      continue;
    }

    mapped[normalizedName] = toPositiveNumber(variable.value);
  }

  return mapped;
}

/**
 * 判定値を人間向け文言へ変換する。
 *
 * @param {ComplexityVerdict} verdict 判定値。
 * @returns {string} 表示文言。
 */
function toVerdictLabel(verdict: ComplexityVerdict): string {
  if (verdict === 'safe') {
    return '余裕で間に合う';
  }

  if (verdict === 'borderline') {
    return 'ギリギリ間に合う';
  }

  return '間に合わない';
}

/**
 * 計算量チェッカー状態を管理するZustandストア。
 */
export const useComplexityStore = create<ComplexityStore>((set, get) => ({
  variables: [
    { id: 'var-1', name: 'N', value: '200000' },
    { id: 'var-2', name: 'M', value: '200000' },
  ],
  selectedPresetId: 'O_N_LOG_N',
  timeLimitSec: '2',
  lastResult: null,
  statusSummary: 'O(N log N) 未チェック',

  /**
   * 計算量プリセットを変更する。
   *
   * @param {string} presetId プリセットID。
   * @returns {void} 値は返さない。
   */
  setSelectedPresetId: (presetId: string): void => {
    set({ selectedPresetId: presetId });
  },

  /**
   * 制限時間を更新する。
   *
   * @param {string} value 秒数入力。
   * @returns {void} 値は返さない。
   */
  setTimeLimitSec: (value: string): void => {
    set({ timeLimitSec: value });
  },

  /**
   * 変数名を更新する。
   *
   * @param {string} variableId 対象ID。
   * @param {string} name 変数名。
   * @returns {void} 値は返さない。
   */
  setVariableName: (variableId: string, name: string): void => {
    set((state) => ({
      variables: state.variables.map((variable) => (variable.id === variableId ? { ...variable, name } : variable)),
    }));
  },

  /**
   * 変数値を更新する。
   *
   * @param {string} variableId 対象ID。
   * @param {string} value 変数値。
   * @returns {void} 値は返さない。
   */
  setVariableValue: (variableId: string, value: string): void => {
    set((state) => ({
      variables: state.variables.map((variable) => (variable.id === variableId ? { ...variable, value } : variable)),
    }));
  },

  /**
   * 入力変数を1件追加する。
   *
   * @returns {void} 値は返さない。
   */
  addVariable: (): void => {
    const name = `X${variableSequence - 2}`;
    const id = `var-${variableSequence}`;
    variableSequence += 1;

    set((state) => ({
      variables: [...state.variables, { id, name, value: '0' }],
    }));
  },

  /**
   * 入力変数を削除する。最低1件は保持する。
   *
   * @param {string} variableId 削除対象ID。
   * @returns {void} 値は返さない。
   */
  removeVariable: (variableId: string): void => {
    set((state) => {
      if (state.variables.length <= 1) {
        return state;
      }

      return {
        variables: state.variables.filter((variable) => variable.id !== variableId),
      };
    });
  },

  /**
   * 現在入力値で演算回数を試算し、判定結果を更新する。
   *
   * @returns {ComplexityCheckResult} 判定結果。
   */
  runCheck: (): ComplexityCheckResult => {
    const state = get();
    const preset = COMPLEXITY_PRESETS.find((item) => item.id === state.selectedPresetId) ?? COMPLEXITY_PRESETS[0];
    const variableMap = toVariableMap(state.variables);
    const estimatedOpsRaw = preset.evaluate(variableMap);
    const estimatedOps = Number.isFinite(estimatedOpsRaw) && estimatedOpsRaw >= 0 ? estimatedOpsRaw : Number.POSITIVE_INFINITY;
    const timeLimitSec = toPositiveNumber(state.timeLimitSec);
    const limitOps = timeLimitSec * 100_000_000;

    const verdict: ComplexityVerdict =
      estimatedOps <= limitOps * 0.1 ? 'safe' : estimatedOps <= limitOps ? 'borderline' : 'unsafe';
    const verdictLabel = toVerdictLabel(verdict);
    const marker = verdict === 'safe' ? 'OK' : verdict === 'borderline' ? 'WARN' : 'NG';
    const result: ComplexityCheckResult = {
      presetLabel: preset.label,
      estimatedOps,
      limitOps,
      verdict,
      verdictLabel,
    };

    set({
      lastResult: result,
      statusSummary: `${preset.label} -> ~${formatOperationCount(estimatedOps)} ${marker}`,
    });

    return result;
  },
}));
