import { create } from 'zustand';
import defaultTemplate from '../../../data/defaultTemplate.cpp?raw';
import {
  DEFAULT_SHORTCUT_BINDINGS,
  normalizeShortcutBinding,
  type ShortcutAction,
  type ShortcutBindingMap,
} from '../utils/shortcut';

const SETTINGS_STORAGE_KEY = 'cpeditor.settings.v1';
const MIN_EDITOR_FONT_SIZE = 10;
const MAX_EDITOR_FONT_SIZE = 32;

const DEFAULT_QUICK_SNIPPET = [
  'for (int i = 0; i < n; ++i) {',
  '    ',
  '}',
].join('\n');

interface PersistedSettings {
  editorFontSize: number;
  lineNumbersEnabled: boolean;
  minimapEnabled: boolean;
  wordWrapEnabled: boolean;
  vimModeEnabled: boolean;
  problemTemplate: string;
  quickSnippet: string;
  shortcuts: ShortcutBindingMap;
}

interface SettingsStoreState extends PersistedSettings {}

interface SettingsStoreActions {
  setEditorFontSize: (fontSize: number) => void;
  setLineNumbersEnabled: (enabled: boolean) => void;
  setMinimapEnabled: (enabled: boolean) => void;
  setWordWrapEnabled: (enabled: boolean) => void;
  setVimModeEnabled: (enabled: boolean) => void;
  setProblemTemplate: (template: string) => void;
  resetProblemTemplate: () => void;
  setQuickSnippet: (snippet: string) => void;
  resetQuickSnippet: () => void;
  setShortcutBinding: (action: ShortcutAction, shortcut: string) => void;
  resetShortcutBinding: (action: ShortcutAction) => void;
  resetAllSettings: () => void;
}

type SettingsStore = SettingsStoreState & SettingsStoreActions;

/**
 * 設定オブジェクトのデフォルト値を返す。
 *
 * @returns {PersistedSettings} デフォルト設定値。
 */
function createDefaultSettings(): PersistedSettings {
  return {
    editorFontSize: 14,
    lineNumbersEnabled: true,
    minimapEnabled: true,
    wordWrapEnabled: false,
    vimModeEnabled: false,
    problemTemplate: defaultTemplate,
    quickSnippet: DEFAULT_QUICK_SNIPPET,
    shortcuts: { ...DEFAULT_SHORTCUT_BINDINGS },
  };
}

/**
 * フォントサイズを許容範囲へ丸める。
 *
 * @param {number} fontSize 入力フォントサイズ。
 * @returns {number} 補正済みフォントサイズ。
 */
function toSafeFontSize(fontSize: number): number {
  if (!Number.isFinite(fontSize)) {
    return 14;
  }

  return Math.max(MIN_EDITOR_FONT_SIZE, Math.min(MAX_EDITOR_FONT_SIZE, Math.floor(fontSize)));
}

/**
 * 文字列値をテンプレート用に正規化する。
 *
 * @param {unknown} value 値候補。
 * @param {string} fallback フォールバック文字列。
 * @returns {string} 正規化文字列。
 */
function toSafeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.replace(/\r\n/g, '\n');
}

/**
 * ショートカット設定を正規化する。
 *
 * @param {unknown} rawShortcuts 読み込んだショートカット値。
 * @returns {ShortcutBindingMap} 補正済みショートカット。
 */
function toSafeShortcuts(rawShortcuts: unknown): ShortcutBindingMap {
  const defaults = { ...DEFAULT_SHORTCUT_BINDINGS };
  if (!rawShortcuts || typeof rawShortcuts !== 'object') {
    return defaults;
  }

  const entries = rawShortcuts as Partial<Record<ShortcutAction, unknown>>;
  const normalized: ShortcutBindingMap = { ...defaults };

  for (const action of Object.keys(defaults) as ShortcutAction[]) {
    const value = entries[action];
    if (typeof value !== 'string') {
      continue;
    }

    const parsed = normalizeShortcutBinding(value);
    if (parsed) {
      normalized[action] = parsed;
    }
  }

  return normalized;
}

/**
 * 設定の保存対象フィールドを取り出す。
 *
 * @param {SettingsStoreState} state 現在設定状態。
 * @returns {PersistedSettings} 保存用オブジェクト。
 */
function toPersistedSettings(state: SettingsStoreState): PersistedSettings {
  return {
    editorFontSize: state.editorFontSize,
    lineNumbersEnabled: state.lineNumbersEnabled,
    minimapEnabled: state.minimapEnabled,
    wordWrapEnabled: state.wordWrapEnabled,
    vimModeEnabled: state.vimModeEnabled,
    problemTemplate: state.problemTemplate,
    quickSnippet: state.quickSnippet,
    shortcuts: state.shortcuts,
  };
}

/**
 * 設定をローカルストレージから読み込む。
 *
 * @returns {PersistedSettings} 読み込み結果。
 */
function loadSettings(): PersistedSettings {
  const defaults = createDefaultSettings();

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      editorFontSize: toSafeFontSize(parsed.editorFontSize ?? defaults.editorFontSize),
      lineNumbersEnabled: parsed.lineNumbersEnabled !== false,
      minimapEnabled: parsed.minimapEnabled !== false,
      wordWrapEnabled: parsed.wordWrapEnabled === true,
      vimModeEnabled: parsed.vimModeEnabled === true,
      problemTemplate: toSafeText(parsed.problemTemplate, defaults.problemTemplate),
      quickSnippet: toSafeText(parsed.quickSnippet, defaults.quickSnippet),
      shortcuts: toSafeShortcuts(parsed.shortcuts),
    };
  } catch {
    return defaults;
  }
}

/**
 * 設定をローカルストレージへ保存する。
 *
 * @param {PersistedSettings} settings 保存対象。
 * @returns {void} 値は返さない。
 */
function saveSettings(settings: PersistedSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存失敗時は無視する
  }
}

const initialSettings = loadSettings();

/**
 * 設定画面用のアプリ設定を管理するZustandストア。
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initialSettings,

  /**
   * エディタフォントサイズを更新する。
   *
   * @param {number} fontSize フォントサイズ。
   * @returns {void} 値は返さない。
   */
  setEditorFontSize: (fontSize: number): void => {
    const safeFontSize = toSafeFontSize(fontSize);
    set({ editorFontSize: safeFontSize });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * 行番号表示の有効/無効を切り替える。
   *
   * @param {boolean} enabled 有効にするか。
   * @returns {void} 値は返さない。
   */
  setLineNumbersEnabled: (enabled: boolean): void => {
    set({ lineNumbersEnabled: enabled });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * ミニマップ表示の有効/無効を切り替える。
   *
   * @param {boolean} enabled 有効にするか。
   * @returns {void} 値は返さない。
   */
  setMinimapEnabled: (enabled: boolean): void => {
    set({ minimapEnabled: enabled });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * 折り返し表示の有効/無効を切り替える。
   *
   * @param {boolean} enabled 有効にするか。
   * @returns {void} 値は返さない。
   */
  setWordWrapEnabled: (enabled: boolean): void => {
    set({ wordWrapEnabled: enabled });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * Vimモードの有効/無効を切り替える。
   *
   * @param {boolean} enabled 有効にするか。
   * @returns {void} 値は返さない。
   */
  setVimModeEnabled: (enabled: boolean): void => {
    set({ vimModeEnabled: enabled });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * 問題選択時に挿入するテンプレート本文を更新する。
   *
   * @param {string} template テンプレート本文。
   * @returns {void} 値は返さない。
   */
  setProblemTemplate: (template: string): void => {
    set({ problemTemplate: toSafeText(template, defaultTemplate) });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * 問題テンプレートを初期値に戻す。
   *
   * @returns {void} 値は返さない。
   */
  resetProblemTemplate: (): void => {
    set({ problemTemplate: defaultTemplate });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * クイックスニペット本文を更新する。
   *
   * @param {string} snippet スニペット本文。
   * @returns {void} 値は返さない。
   */
  setQuickSnippet: (snippet: string): void => {
    set({ quickSnippet: toSafeText(snippet, DEFAULT_QUICK_SNIPPET) });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * クイックスニペットを初期値に戻す。
   *
   * @returns {void} 値は返さない。
   */
  resetQuickSnippet: (): void => {
    set({ quickSnippet: DEFAULT_QUICK_SNIPPET });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * ショートカット割り当てを更新する。
   *
   * @param {ShortcutAction} action 変更対象アクション。
   * @param {string} shortcut 設定ショートカット。
   * @returns {void} 値は返さない。
   */
  setShortcutBinding: (action: ShortcutAction, shortcut: string): void => {
    const normalized = normalizeShortcutBinding(shortcut);
    if (!normalized) {
      return;
    }

    const nextShortcuts = {
      ...get().shortcuts,
      [action]: normalized,
    };

    set({ shortcuts: nextShortcuts });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * 指定アクションのショートカットを初期値へ戻す。
   *
   * @param {ShortcutAction} action 対象アクション。
   * @returns {void} 値は返さない。
   */
  resetShortcutBinding: (action: ShortcutAction): void => {
    const nextShortcuts = {
      ...get().shortcuts,
      [action]: DEFAULT_SHORTCUT_BINDINGS[action],
    };

    set({ shortcuts: nextShortcuts });
    saveSettings(toPersistedSettings(get()));
  },

  /**
   * 全設定を初期値へ戻す。
   *
   * @returns {void} 値は返さない。
   */
  resetAllSettings: (): void => {
    const defaults = createDefaultSettings();
    set({ ...defaults });
    saveSettings(defaults);
  },
}));
