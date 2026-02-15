import { create } from 'zustand';

const TIMER_RECORDS_STORAGE_KEY = 'cpeditor.timer.records.v1';
const TIMER_SETTINGS_STORAGE_KEY = 'cpeditor.timer.settings.v1';

interface TimerSettings {
  autoStartOnProblemSelect: boolean;
  autoStopOnAC: boolean;
}

interface TimerStoreState {
  selectedProblemId: string | null;
  isRunning: boolean;
  elapsedMs: number;
  startedAtMs: number | null;
  tickMs: number;
  recordsByProblem: Record<string, number>;
  autoStartOnProblemSelect: boolean;
  autoStopOnAC: boolean;
}

interface TimerStoreActions {
  setSelectedProblem: (problemId: string | null) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  refreshTick: () => void;
  stopOnAcceptedIfEnabled: () => void;
  setAutoStartOnProblemSelect: (enabled: boolean) => void;
  setAutoStopOnAC: (enabled: boolean) => void;
  getCurrentElapsedMs: () => number;
}

type TimerStore = TimerStoreState & TimerStoreActions;

/**
 * ローカル保存されたタイマー設定を読み込む。
 *
 * @returns {TimerSettings} 設定値。
 */
function loadSettings(): TimerSettings {
  try {
    const raw = window.localStorage.getItem(TIMER_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        autoStartOnProblemSelect: false,
        autoStopOnAC: true,
      };
    }

    const parsed = JSON.parse(raw) as Partial<TimerSettings>;
    return {
      autoStartOnProblemSelect: parsed.autoStartOnProblemSelect === true,
      autoStopOnAC: parsed.autoStopOnAC !== false,
    };
  } catch {
    return {
      autoStartOnProblemSelect: false,
      autoStopOnAC: true,
    };
  }
}

/**
 * 問題ごとの経過時間記録を読み込む。
 *
 * @returns {Record<string, number>} 問題ID -> 経過ms。
 */
function loadRecords(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(TIMER_RECORDS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const records: Record<string, number> = {};

    for (const [problemId, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        records[problemId] = value;
      }
    }

    return records;
  } catch {
    return {};
  }
}

/**
 * タイマー設定をローカル保存する。
 *
 * @param {TimerSettings} settings 保存する設定。
 * @returns {void} 値は返さない。
 */
function saveSettings(settings: TimerSettings): void {
  try {
    window.localStorage.setItem(TIMER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存失敗時は黙って無視する
  }
}

/**
 * 問題ごとの経過時間記録をローカル保存する。
 *
 * @param {Record<string, number>} records 保存する記録。
 * @returns {void} 値は返さない。
 */
function saveRecords(records: Record<string, number>): void {
  try {
    window.localStorage.setItem(TIMER_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 保存失敗時は黙って無視する
  }
}

const initialSettings = loadSettings();
const initialRecords = loadRecords();

/**
 * ミリ秒値を `HH:MM:SS` 形式に整形する。
 *
 * @param {number} elapsedMs 経過時間（ms）。
 * @returns {string} 表示文字列。
 */
export function formatElapsedDuration(elapsedMs: number): string {
  const safeMs = Number.isFinite(elapsedMs) && elapsedMs > 0 ? Math.floor(elapsedMs) : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

/**
 * タイマー状態を管理するZustandストア。
 */
export const useTimerStore = create<TimerStore>((set, get) => ({
  selectedProblemId: null,
  isRunning: false,
  elapsedMs: 0,
  startedAtMs: null,
  tickMs: Date.now(),
  recordsByProblem: initialRecords,
  autoStartOnProblemSelect: initialSettings.autoStartOnProblemSelect,
  autoStopOnAC: initialSettings.autoStopOnAC,

  /**
   * 現在選択中問題にタイマー文脈を切り替える。
   *
   * @param {string | null} problemId 選択した問題ID。
   * @returns {void} 値は返さない。
   */
  setSelectedProblem: (problemId: string | null): void => {
    const state = get();
    if (state.selectedProblemId === problemId) {
      return;
    }

    const now = Date.now();
    const previousElapsed =
      state.isRunning && state.startedAtMs != null ? state.elapsedMs + (now - state.startedAtMs) : state.elapsedMs;

    const nextRecords = { ...state.recordsByProblem };
    if (state.selectedProblemId) {
      nextRecords[state.selectedProblemId] = previousElapsed;
      saveRecords(nextRecords);
    }

    const nextElapsed = problemId ? nextRecords[problemId] ?? 0 : 0;
    const shouldAutoStart = state.autoStartOnProblemSelect && problemId != null;

    set({
      selectedProblemId: problemId,
      recordsByProblem: nextRecords,
      elapsedMs: nextElapsed,
      startedAtMs: null,
      isRunning: false,
      tickMs: now,
    });

    if (shouldAutoStart) {
      get().start();
    }
  },

  /**
   * タイマーを開始する。
   *
   * @returns {void} 値は返さない。
   */
  start: (): void => {
    const { isRunning } = get();
    if (isRunning) {
      return;
    }

    const now = Date.now();
    set({
      isRunning: true,
      startedAtMs: now,
      tickMs: now,
    });
  },

  /**
   * タイマーを一時停止し、経過時間を確定する。
   *
   * @returns {void} 値は返さない。
   */
  pause: (): void => {
    const state = get();
    if (!state.isRunning || state.startedAtMs == null) {
      return;
    }

    const now = Date.now();
    const nextElapsed = state.elapsedMs + (now - state.startedAtMs);
    const nextRecords = { ...state.recordsByProblem };

    if (state.selectedProblemId) {
      nextRecords[state.selectedProblemId] = nextElapsed;
      saveRecords(nextRecords);
    }

    set({
      isRunning: false,
      startedAtMs: null,
      elapsedMs: nextElapsed,
      recordsByProblem: nextRecords,
      tickMs: now,
    });
  },

  /**
   * 現在問題のタイマーを0へ戻す。
   *
   * @returns {void} 値は返さない。
   */
  reset: (): void => {
    const state = get();
    const now = Date.now();
    const nextRecords = { ...state.recordsByProblem };

    if (state.selectedProblemId) {
      nextRecords[state.selectedProblemId] = 0;
      saveRecords(nextRecords);
    }

    set({
      isRunning: false,
      startedAtMs: null,
      elapsedMs: 0,
      recordsByProblem: nextRecords,
      tickMs: now,
    });
  },

  /**
   * 実行中タイマー表示更新用の時刻を更新する。
   *
   * @returns {void} 値は返さない。
   */
  refreshTick: (): void => {
    if (!get().isRunning) {
      return;
    }

    set({ tickMs: Date.now() });
  },

  /**
   * AC時自動停止設定が有効ならタイマーを停止する。
   *
   * @returns {void} 値は返さない。
   */
  stopOnAcceptedIfEnabled: (): void => {
    const { autoStopOnAC, isRunning } = get();
    if (!autoStopOnAC || !isRunning) {
      return;
    }

    get().pause();
  },

  /**
   * 問題選択時の自動開始設定を変更する。
   *
   * @param {boolean} enabled 有効化するか。
   * @returns {void} 値は返さない。
   */
  setAutoStartOnProblemSelect: (enabled: boolean): void => {
    const { autoStopOnAC } = get();
    saveSettings({ autoStartOnProblemSelect: enabled, autoStopOnAC });
    set({ autoStartOnProblemSelect: enabled });
  },

  /**
   * AC時自動停止設定を変更する。
   *
   * @param {boolean} enabled 有効化するか。
   * @returns {void} 値は返さない。
   */
  setAutoStopOnAC: (enabled: boolean): void => {
    const { autoStartOnProblemSelect } = get();
    saveSettings({ autoStartOnProblemSelect, autoStopOnAC: enabled });
    set({ autoStopOnAC: enabled });
  },

  /**
   * 現在選択中問題の経過時間を返す。
   *
   * @returns {number} 経過時間（ms）。
   */
  getCurrentElapsedMs: (): number => {
    const state = get();
    if (!state.isRunning || state.startedAtMs == null) {
      return state.elapsedMs;
    }

    return state.elapsedMs + (Date.now() - state.startedAtMs);
  },
}));
