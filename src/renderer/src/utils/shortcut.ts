export type ShortcutAction = 'runSampleTests' | 'formatCode' | 'timerStart' | 'timerPause' | 'timerReset';

export type ShortcutBindingMap = Record<ShortcutAction, string>;

export interface ShortcutDefinition {
  action: ShortcutAction;
  label: string;
  description: string;
}

interface ParsedShortcutBinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

const MODIFIER_ALIAS_MAP: Record<string, 'ctrl' | 'shift' | 'alt' | 'meta'> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  win: 'meta',
  windows: 'meta',
};

const KEY_ALIAS_MAP: Record<string, string> = {
  esc: 'Escape',
  escape: 'Escape',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  space: 'Space',
  spacebar: 'Space',
  delete: 'Delete',
  del: 'Delete',
  backspace: 'Backspace',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  arrowup: 'ArrowUp',
  up: 'ArrowUp',
  arrowdown: 'ArrowDown',
  down: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  left: 'ArrowLeft',
  arrowright: 'ArrowRight',
  right: 'ArrowRight',
  plus: 'Plus',
};

const MODIFIER_KEY_NAMES = new Set(['Control', 'Shift', 'Alt', 'Meta']);

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    action: 'runSampleTests',
    label: 'テスト実行',
    description: '選択中問題のサンプルケースをまとめて実行します。',
  },
  {
    action: 'formatCode',
    label: 'コード整形',
    description: '現在のC++ソースコードを clang-format で整形します。',
  },
  {
    action: 'timerStart',
    label: 'タイマー開始',
    description: '学習タイマーを開始します。',
  },
  {
    action: 'timerPause',
    label: 'タイマー一時停止',
    description: '学習タイマーを一時停止します。',
  },
  {
    action: 'timerReset',
    label: 'タイマーリセット',
    description: '現在問題の経過時間を0へ戻します。',
  },
];

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindingMap = {
  runSampleTests: 'Ctrl+Enter',
  formatCode: 'Ctrl+S',
  timerStart: 'Ctrl+Shift+S',
  timerPause: 'Ctrl+Shift+P',
  timerReset: 'Ctrl+Shift+R',
};

/**
 * 入力トークンを比較用キー名へ正規化する。
 *
 * @param {string} token キー名トークン。
 * @returns {string | null} 正規化キー名。解釈不能ならnull。
 */
function normalizeKeyToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === '+') {
    return 'Plus';
  }

  const lower = trimmed.toLowerCase();
  if (KEY_ALIAS_MAP[lower]) {
    return KEY_ALIAS_MAP[lower];
  }

  if (/^f([1-9]|1[0-2])$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (trimmed.length === 1) {
    if (trimmed === ' ') {
      return 'Space';
    }
    return trimmed.toUpperCase();
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

/**
 * 文字列表現ショートカットを内部形式へ変換する。
 *
 * @param {string} shortcut ショートカット文字列。
 * @returns {ParsedShortcutBinding | null} 変換結果。無効値はnull。
 */
function parseShortcutBinding(shortcut: string): ParsedShortcutBinding | null {
  const trimmed = shortcut.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const parsed: ParsedShortcutBinding = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: '',
  };

  for (const token of tokens) {
    const modifier = MODIFIER_ALIAS_MAP[token.toLowerCase()];
    if (modifier) {
      parsed[modifier] = true;
      continue;
    }

    if (parsed.key) {
      return null;
    }

    const normalizedKey = normalizeKeyToken(token);
    if (!normalizedKey || MODIFIER_KEY_NAMES.has(normalizedKey)) {
      return null;
    }

    parsed.key = normalizedKey;
  }

  if (!parsed.key) {
    return null;
  }

  if (!parsed.ctrl && !parsed.shift && !parsed.alt && !parsed.meta) {
    return null;
  }

  return parsed;
}

/**
 * ショートカット内部形式を保存・表示用文字列へ整形する。
 *
 * @param {ParsedShortcutBinding} shortcut パース済みショートカット。
 * @returns {string} 正規化済みショートカット文字列。
 */
function formatShortcutBinding(shortcut: ParsedShortcutBinding): string {
  const parts: string[] = [];
  if (shortcut.ctrl) {
    parts.push('Ctrl');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push('Alt');
  }
  if (shortcut.meta) {
    parts.push('Meta');
  }
  parts.push(shortcut.key);
  return parts.join('+');
}

/**
 * 文字列ショートカットを正規化する。
 *
 * @param {string} shortcut 正規化対象。
 * @returns {string | null} 正規化済み文字列。無効値はnull。
 */
export function normalizeShortcutBinding(shortcut: string): string | null {
  const parsed = parseShortcutBinding(shortcut);
  if (!parsed) {
    return null;
  }

  return formatShortcutBinding(parsed);
}

/**
 * 文字列ショートカットが有効か検証する。
 *
 * @param {string} shortcut 検証対象。
 * @returns {boolean} 有効ならtrue。
 */
export function isValidShortcutBinding(shortcut: string): boolean {
  return normalizeShortcutBinding(shortcut) != null;
}

/**
 * KeyboardEvent.key を比較用キー名へ正規化する。
 *
 * @param {string} key キーイベント値。
 * @returns {string | null} 正規化キー名。比較不能ならnull。
 */
function normalizeEventKey(key: string): string | null {
  if (!key) {
    return null;
  }

  if (key === '+') {
    return 'Plus';
  }

  if (key === ' ') {
    return 'Space';
  }

  if (MODIFIER_KEY_NAMES.has(key)) {
    return key;
  }

  return normalizeKeyToken(key);
}

/**
 * キーボードイベントをショートカット文字列へ変換する。
 *
 * @param {KeyboardEvent} event キー入力イベント。
 * @returns {string | null} 変換結果。修飾キーのみの場合はnull。
 */
export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  const key = normalizeEventKey(event.key);
  if (!key || MODIFIER_KEY_NAMES.has(key)) {
    return null;
  }

  if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
    return null;
  }

  const parsed: ParsedShortcutBinding = {
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
    key,
  };

  return formatShortcutBinding(parsed);
}

/**
 * KeyboardEvent とショートカット文字列が一致するか判定する。
 *
 * @param {KeyboardEvent} event 比較対象イベント。
 * @param {string} shortcut 比較対象ショートカット。
 * @returns {boolean} 一致ならtrue。
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcutBinding(shortcut);
  const key = normalizeEventKey(event.key);
  if (!parsed || !key || MODIFIER_KEY_NAMES.has(key)) {
    return false;
  }

  return (
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta &&
    key === parsed.key
  );
}
