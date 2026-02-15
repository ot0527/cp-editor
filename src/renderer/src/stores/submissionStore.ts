import { create } from 'zustand';
import type { SubmissionItem } from '../../../shared/types/submission';

const SUBMISSION_SETTINGS_STORAGE_KEY = 'cpeditor.submissions.settings.v1';

interface SubmissionSettings {
  username: string;
  lookbackDays: number;
}

interface SubmissionStoreState {
  username: string;
  lookbackDays: string;
  isLoading: boolean;
  errorMessage: string | null;
  submissions: SubmissionItem[];
  lastFetchedAt: number | null;
}

interface SubmissionStoreActions {
  setUsername: (username: string) => void;
  setLookbackDays: (days: string) => void;
  fetchSubmissions: () => Promise<void>;
}

type SubmissionStore = SubmissionStoreState & SubmissionStoreActions;

/**
 * unknownエラーをユーザー表示向け文字列へ変換する。
 *
 * @param {unknown} error 発生エラー。
 * @returns {string} 表示メッセージ。
 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '提出履歴の取得に失敗しました。';
}

/**
 * 提出履歴設定をローカルから読み込む。
 *
 * @returns {SubmissionSettings} 保存設定。
 */
function loadSettings(): SubmissionSettings {
  try {
    const raw = window.localStorage.getItem(SUBMISSION_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { username: '', lookbackDays: 30 };
    }

    const parsed = JSON.parse(raw) as Partial<SubmissionSettings>;
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      lookbackDays:
        typeof parsed.lookbackDays === 'number' && Number.isFinite(parsed.lookbackDays) && parsed.lookbackDays > 0
          ? Math.floor(parsed.lookbackDays)
          : 30,
    };
  } catch {
    return { username: '', lookbackDays: 30 };
  }
}

/**
 * 提出履歴設定をローカルへ保存する。
 *
 * @param {SubmissionSettings} settings 保存設定。
 * @returns {void} 値は返さない。
 */
function saveSettings(settings: SubmissionSettings): void {
  try {
    window.localStorage.setItem(SUBMISSION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存失敗時は無視する
  }
}

const initialSettings = loadSettings();

/**
 * 提出履歴取得状態を管理するZustandストア。
 */
export const useSubmissionStore = create<SubmissionStore>((set, get) => ({
  username: initialSettings.username,
  lookbackDays: String(initialSettings.lookbackDays),
  isLoading: false,
  errorMessage: null,
  submissions: [],
  lastFetchedAt: null,

  /**
   * ユーザー名入力を更新する。
   *
   * @param {string} username ユーザー名。
   * @returns {void} 値は返さない。
   */
  setUsername: (username: string): void => {
    const { lookbackDays } = get();
    const parsedDays = Number(lookbackDays);
    const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.floor(parsedDays) : 30;

    saveSettings({
      username,
      lookbackDays: safeDays,
    });

    set({ username });
  },

  /**
   * 取得対象期間（日数）を更新する。
   *
   * @param {string} days 日数入力。
   * @returns {void} 値は返さない。
   */
  setLookbackDays: (days: string): void => {
    const { username } = get();
    const parsedDays = Number(days);
    const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.floor(parsedDays) : 30;

    saveSettings({
      username,
      lookbackDays: safeDays,
    });

    set({ lookbackDays: days });
  },

  /**
   * 現在入力中のユーザー名で提出履歴を取得する。
   *
   * @returns {Promise<void>} 値は返さない。
   */
  fetchSubmissions: async (): Promise<void> => {
    const state = get();
    const username = state.username.trim();
    const parsedDays = Number(state.lookbackDays);
    const lookbackDays = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.floor(parsedDays) : 30;

    if (!username) {
      set({
        errorMessage: 'AtCoderユーザー名を入力してください。',
        submissions: [],
      });
      return;
    }

    const nowSecond = Math.floor(Date.now() / 1000);
    const fromSecond = Math.max(0, nowSecond - lookbackDays * 24 * 60 * 60);

    set({
      isLoading: true,
      errorMessage: null,
    });

    try {
      const submissions = await window.cpeditor.submissions.fetchByUser({
        username,
        fromSecond,
      });

      saveSettings({
        username,
        lookbackDays,
      });

      set({
        submissions,
        isLoading: false,
        errorMessage: null,
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: toErrorMessage(error),
      });
    }
  },
}));
