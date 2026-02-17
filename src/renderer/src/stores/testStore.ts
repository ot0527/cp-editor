import { create } from 'zustand';
import type { CustomRunResult, RunSampleTestCase, TestCaseResult } from '../../../shared/types/compiler';
import type { ProblemSample } from '../../../shared/types/problem';
import { useComplexityStore } from './complexityStore';

type BottomTab = 'results' | 'custom' | 'complexity';

interface TestStoreState {
  activeTab: BottomTab;
  isRunningTests: boolean;
  isRunningCustomInput: boolean;
  compileErrorMessage: string | null;
  testResults: TestCaseResult[];
  customInput: string;
  customResult: CustomRunResult | null;
}

interface TestStoreActions {
  setActiveTab: (tab: BottomTab) => void;
  setCustomInput: (input: string) => void;
  clearCustomResult: () => void;
  runSampleTests: (sourceCode: string, samples: ProblemSample[]) => Promise<void>;
  runCustomInput: (sourceCode: string) => Promise<void>;
}

type TestStore = TestStoreState & TestStoreActions;

const DEFAULT_EXEC_TIMEOUT_MS = 5000;

/**
 * unknownエラーをユーザー表示向け文字列へ変換する。
 *
 * @param {unknown} error 発生したエラー。
 * @returns {string} 表示用メッセージ。
 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '不明なエラーが発生しました。';
}

/**
 * 問題サンプル配列をIPC向けテストケース形式へ変換する。
 *
 * @param {ProblemSample[]} samples 問題サンプル。
 * @returns {RunSampleTestCase[]} IPCリクエスト用ケース配列。
 */
function toRunSampleTestCases(samples: ProblemSample[]): RunSampleTestCase[] {
  return samples.map((sample) => ({
    caseIndex: sample.index,
    caseName: `Sample ${sample.index}`,
    input: sample.input,
    expectedOutput: sample.output,
  }));
}

/**
 * テスト実行状態を保持するZustandストア。
 */
export const useTestStore = create<TestStore>((set, get) => ({
  activeTab: 'results',
  isRunningTests: false,
  isRunningCustomInput: false,
  compileErrorMessage: null,
  testResults: [],
  customInput: '',
  customResult: null,

  /**
   * ボトムパネルのアクティブタブを変更する。
   *
   * @param {BottomTab} tab 遷移先タブ。
   * @returns {void} 値は返さない。
   */
  setActiveTab: (tab: BottomTab): void => {
    set({ activeTab: tab });
  },

  /**
   * カスタム入力欄の文字列を更新する。
   *
   * @param {string} input 入力文字列。
   * @returns {void} 値は返さない。
   */
  setCustomInput: (input: string): void => {
    set({ customInput: input });
  },

  /**
   * カスタム実行の結果表示をクリアする。
   *
   * @returns {void} 値は返さない。
   */
  clearCustomResult: (): void => {
    set({ customResult: null, compileErrorMessage: null });
  },

  /**
   * 選択中問題のサンプルケースでコンパイル・実行を行う。
   *
   * @param {string} sourceCode エディタのC++ソースコード。
   * @param {ProblemSample[]} samples 問題サンプル。
   * @returns {Promise<void>} 値は返さない。
   */
  runSampleTests: async (sourceCode: string, samples: ProblemSample[]): Promise<void> => {
    useComplexityStore.getState().analyzeSourceCode(sourceCode);

    if (!samples.length) {
      set({
        compileErrorMessage: 'サンプルケースが見つかりません。問題文を読み込んでください。',
        testResults: [],
        activeTab: 'results',
      });
      return;
    }

    set({
      isRunningTests: true,
      compileErrorMessage: null,
      activeTab: 'results',
    });

    try {
      const response = await window.cpeditor.compiler.runSampleTests({
        sourceCode,
        testCases: toRunSampleTestCases(samples),
        timeoutMs: DEFAULT_EXEC_TIMEOUT_MS,
      });

      if (!response.compile.success) {
        set({
          testResults: [],
          compileErrorMessage: response.compile.errorMessage || response.compile.stderr || 'Compilation failed.',
        });
        return;
      }

      set({
        testResults: response.results,
        compileErrorMessage: null,
      });
    } catch (error) {
      set({
        testResults: [],
        compileErrorMessage: toErrorMessage(error),
      });
    } finally {
      set({ isRunningTests: false });
    }
  },

  /**
   * カスタム入力でコンパイル・実行を行う。
   *
   * @param {string} sourceCode エディタのC++ソースコード。
   * @returns {Promise<void>} 値は返さない。
   */
  runCustomInput: async (sourceCode: string): Promise<void> => {
    useComplexityStore.getState().analyzeSourceCode(sourceCode);

    const input = get().customInput;

    set({
      isRunningCustomInput: true,
      compileErrorMessage: null,
      activeTab: 'custom',
    });

    try {
      const response = await window.cpeditor.compiler.runCustomInput({
        sourceCode,
        input,
        timeoutMs: DEFAULT_EXEC_TIMEOUT_MS,
      });

      if (!response.compile.success) {
        set({
          compileErrorMessage: response.compile.errorMessage || response.compile.stderr || 'Compilation failed.',
          customResult: null,
        });
        return;
      }

      set({
        compileErrorMessage: null,
        customResult: response.result,
      });
    } catch (error) {
      set({
        compileErrorMessage: toErrorMessage(error),
        customResult: null,
      });
    } finally {
      set({ isRunningCustomInput: false });
    }
  },
}));
