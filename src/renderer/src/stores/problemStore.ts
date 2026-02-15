import { create } from 'zustand';
import type { ProblemDetail, ProblemIndexItem } from '../../../shared/types/problem';

interface ProblemStoreState {
  problems: ProblemIndexItem[];
  selectedProblemId: string | null;
  selectedProblemDetail: ProblemDetail | null;
  searchQuery: string;
  isLoadingProblems: boolean;
  isLoadingProblemDetail: boolean;
  errorMessage: string | null;
}

interface ProblemStoreActions {
  setSearchQuery: (query: string) => void;
  loadProblems: () => Promise<void>;
  selectProblem: (problemId: string) => Promise<void>;
  refreshSelectedProblem: () => Promise<void>;
}

type ProblemStore = ProblemStoreState & ProblemStoreActions;

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
 * 問題データ・選択状態を保持するZustandストア。
 */
export const useProblemStore = create<ProblemStore>((set, get) => ({
  problems: [],
  selectedProblemId: null,
  selectedProblemDetail: null,
  searchQuery: '',
  isLoadingProblems: false,
  isLoadingProblemDetail: false,
  errorMessage: null,

  /**
   * サイドバー検索クエリを更新する。
   *
   * @param {string} query 検索クエリ。
   * @returns {void} 値は返さない。
   */
  setSearchQuery: (query: string): void => {
    set({ searchQuery: query });
  },

  /**
   * AtCoder Problems APIから問題一覧を読み込む。
   *
   * @returns {Promise<void>} 値は返さない。
   */
  loadProblems: async (): Promise<void> => {
    set({ isLoadingProblems: true, errorMessage: null });

    try {
      const problems = await window.cpeditor.problems.fetchIndex();
      set({ problems, isLoadingProblems: false });

      if (problems.length === 0) {
        set({ selectedProblemId: null, selectedProblemDetail: null });
        return;
      }

      const currentSelectedId = get().selectedProblemId;
      const selected = problems.find((problem) => problem.id === currentSelectedId) ?? problems[0];
      await get().selectProblem(selected.id);
    } catch (error) {
      set({
        isLoadingProblems: false,
        errorMessage: toErrorMessage(error),
      });
    }
  },

  /**
   * 問題を選択し、問題詳細を取得する。
   *
   * @param {string} problemId 選択する問題ID。
   * @returns {Promise<void>} 値は返さない。
   */
  selectProblem: async (problemId: string): Promise<void> => {
    const selectedProblem = get().problems.find((problem) => problem.id === problemId);
    if (!selectedProblem) {
      return;
    }

    set({
      selectedProblemId: problemId,
      selectedProblemDetail: null,
      isLoadingProblemDetail: true,
      errorMessage: null,
    });

    try {
      const detail = await window.cpeditor.problems.fetchDetail({
        contestId: selectedProblem.contestId,
        problemId: selectedProblem.id,
        title: selectedProblem.title,
      });

      if (get().selectedProblemId !== problemId) {
        return;
      }

      set({
        selectedProblemDetail: detail,
        isLoadingProblemDetail: false,
      });
    } catch (error) {
      if (get().selectedProblemId !== problemId) {
        return;
      }

      set({
        isLoadingProblemDetail: false,
        errorMessage: toErrorMessage(error),
      });
    }
  },

  /**
   * 現在選択中の問題詳細を再取得する。
   *
   * @returns {Promise<void>} 値は返さない。
   */
  refreshSelectedProblem: async (): Promise<void> => {
    const selectedProblemId = get().selectedProblemId;
    if (!selectedProblemId) {
      return;
    }

    await get().selectProblem(selectedProblemId);
  },
}));
