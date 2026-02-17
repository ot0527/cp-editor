import type { editor as MonacoEditorNamespace } from 'monaco-editor';
import darkModernSource from './vscode-defaults/themes/dark_modern.json?raw';
import darkPlusSource from './vscode-defaults/themes/dark_plus.json?raw';
import darkVsSource from './vscode-defaults/themes/dark_vs.json?raw';
import hcBlackSource from './vscode-defaults/themes/hc_black.json?raw';
import hcLightSource from './vscode-defaults/themes/hc_light.json?raw';
import lightModernSource from './vscode-defaults/themes/light_modern.json?raw';
import lightPlusSource from './vscode-defaults/themes/light_plus.json?raw';
import lightVsSource from './vscode-defaults/themes/light_vs.json?raw';

type VSCodeUiThemeKind = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
type AppThemeMode = 'light' | 'dark';
type JsonObject = Record<string, unknown>;
type MonacoThemeRegistrar = Pick<typeof import('monaco-editor').editor, 'defineTheme'>;

interface EditorThemeOption {
  id: string;
  label: string;
  uiTheme: VSCodeUiThemeKind;
  sourcePath: string;
}

interface TokenColorSettings {
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

interface TokenColorEntry {
  scope?: string | string[];
  settings?: TokenColorSettings;
}

interface ResolvedThemeData {
  colors: MonacoEditorNamespace.IColors;
  tokenColors: TokenColorEntry[];
}

/**
 * cp-editor で選択可能にする VSCode 標準テーマ一覧。
 */
export const VSCODE_STANDARD_THEME_OPTIONS = [
  {
    id: 'default-dark-plus',
    label: 'Default Dark+',
    uiTheme: 'vs-dark',
    sourcePath: 'themes/dark_plus.json',
  },
  {
    id: 'default-dark-modern',
    label: 'Default Dark Modern',
    uiTheme: 'vs-dark',
    sourcePath: 'themes/dark_modern.json',
  },
  {
    id: 'default-light-plus',
    label: 'Default Light+',
    uiTheme: 'vs',
    sourcePath: 'themes/light_plus.json',
  },
  {
    id: 'default-light-modern',
    label: 'Default Light Modern',
    uiTheme: 'vs',
    sourcePath: 'themes/light_modern.json',
  },
  {
    id: 'visual-studio-dark',
    label: 'Visual Studio Dark',
    uiTheme: 'vs-dark',
    sourcePath: 'themes/dark_vs.json',
  },
  {
    id: 'visual-studio-light',
    label: 'Visual Studio Light',
    uiTheme: 'vs',
    sourcePath: 'themes/light_vs.json',
  },
  {
    id: 'default-high-contrast',
    label: 'Default High Contrast',
    uiTheme: 'hc-black',
    sourcePath: 'themes/hc_black.json',
  },
  {
    id: 'default-high-contrast-light',
    label: 'Default High Contrast Light',
    uiTheme: 'hc-light',
    sourcePath: 'themes/hc_light.json',
  },
] as const satisfies readonly EditorThemeOption[];

export type EditorThemeId = (typeof VSCODE_STANDARD_THEME_OPTIONS)[number]['id'];

export const DEFAULT_EDITOR_THEME_ID: EditorThemeId = 'default-dark-plus';

const THEME_SOURCE_BY_PATH: Record<string, string> = {
  'themes/dark_modern.json': darkModernSource,
  'themes/dark_plus.json': darkPlusSource,
  'themes/dark_vs.json': darkVsSource,
  'themes/hc_black.json': hcBlackSource,
  'themes/hc_light.json': hcLightSource,
  'themes/light_modern.json': lightModernSource,
  'themes/light_plus.json': lightPlusSource,
  'themes/light_vs.json': lightVsSource,
};

const THEME_OPTION_BY_ID = new Map<EditorThemeId, (typeof VSCODE_STANDARD_THEME_OPTIONS)[number]>();
const resolvedThemeCache = new Map<string, ResolvedThemeData>();
const registeredThemeNames = new Set<string>();

for (const option of VSCODE_STANDARD_THEME_OPTIONS) {
  THEME_OPTION_BY_ID.set(option.id, option);
}

/**
 * 入力文字列が定義済みのテーマIDか判定する。
 *
 * @param {unknown} value 判定対象。
 * @returns {value is EditorThemeId} テーマIDとして有効な場合はtrue。
 */
export function isEditorThemeId(value: unknown): value is EditorThemeId {
  return typeof value === 'string' && THEME_OPTION_BY_ID.has(value as EditorThemeId);
}

/**
 * テーマIDに対応するテーマ定義を取得する。
 *
 * @param {EditorThemeId} themeId 取得対象テーマID。
 * @returns {(typeof VSCODE_STANDARD_THEME_OPTIONS)[number]} テーマ定義。
 */
export function getEditorThemeOption(themeId: EditorThemeId): (typeof VSCODE_STANDARD_THEME_OPTIONS)[number] {
  return THEME_OPTION_BY_ID.get(themeId) ?? VSCODE_STANDARD_THEME_OPTIONS[0];
}

/**
 * アプリ全体のUIモード（ライト/ダーク）へ変換する。
 *
 * @param {EditorThemeId} themeId 現在のテーマID。
 * @returns {AppThemeMode} CSS用のUIモード。
 */
export function getAppThemeMode(themeId: EditorThemeId): AppThemeMode {
  const theme = getEditorThemeOption(themeId);
  return theme.uiTheme === 'vs' || theme.uiTheme === 'hc-light' ? 'light' : 'dark';
}

/**
 * テーマIDに対応するMonacoテーマ名を返す。
 *
 * @param {EditorThemeId} themeId テーマID。
 * @returns {string} Monacoへ渡すテーマ名。
 */
export function getMonacoThemeName(themeId: EditorThemeId): string {
  return `cpeditor-vscode-${themeId}`;
}

/**
 * VSCode標準テーマをMonacoへ登録する。
 *
 * @param {MonacoThemeRegistrar} monacoEditor Monacoのテーマ登録API。
 * @returns {void} 値は返さない。
 */
export function registerVSCodeStandardThemes(monacoEditor: MonacoThemeRegistrar): void {
  for (const option of VSCODE_STANDARD_THEME_OPTIONS) {
    const monacoThemeName = getMonacoThemeName(option.id);
    if (registeredThemeNames.has(monacoThemeName)) {
      continue;
    }

    monacoEditor.defineTheme(monacoThemeName, createMonacoThemeData(option.id));
    registeredThemeNames.add(monacoThemeName);
  }
}

/**
 * テーマIDからMonaco用テーマ定義を生成する。
 *
 * @param {EditorThemeId} themeId テーマID。
 * @returns {MonacoEditorNamespace.IStandaloneThemeData} Monacoテーマデータ。
 */
function createMonacoThemeData(themeId: EditorThemeId): MonacoEditorNamespace.IStandaloneThemeData {
  const option = getEditorThemeOption(themeId);
  const resolvedTheme = resolveThemeData(option.sourcePath, new Set<string>());

  return {
    base: option.uiTheme,
    inherit: true,
    colors: resolvedTheme.colors,
    rules: resolvedTheme.tokenColors.flatMap((entry) => toMonacoTokenRules(entry)),
  };
}

/**
 * テーマJSONCファイルを展開し、色設定とトークン設定を解決する。
 *
 * @param {string} themePath 解決対象のテーマパス。
 * @param {Set<string>} resolvingPath 循環参照防止用セット。
 * @returns {ResolvedThemeData} 展開済みテーマ設定。
 */
function resolveThemeData(themePath: string, resolvingPath: Set<string>): ResolvedThemeData {
  const cached = resolvedThemeCache.get(themePath);
  if (cached) {
    return cached;
  }

  if (resolvingPath.has(themePath)) {
    return { colors: {}, tokenColors: [] };
  }

  const source = THEME_SOURCE_BY_PATH[themePath];
  if (!source) {
    console.warn(`[cpeditor] Unknown VSCode theme file: ${themePath}`);
    return { colors: {}, tokenColors: [] };
  }

  resolvingPath.add(themePath);
  const parsed = parseJsoncObject(source);

  const mergedColors: MonacoEditorNamespace.IColors = {};
  const mergedTokenColors: TokenColorEntry[] = [];

  const includePath = getStringField(parsed, 'include');
  if (includePath) {
    const includedTheme = resolveThemeData(resolveRelativeThemePath(themePath, includePath), resolvingPath);
    Object.assign(mergedColors, includedTheme.colors);
    mergedTokenColors.push(...includedTheme.tokenColors);
  }

  const tokenColors = parsed.tokenColors;
  if (typeof tokenColors === 'string') {
    mergedTokenColors.push(...resolveTokenColorReference(themePath, tokenColors, resolvingPath));
  } else if (Array.isArray(tokenColors)) {
    mergedTokenColors.push(...resolveTokenColorEntries(themePath, tokenColors, resolvingPath));
  }

  const colors = parsed.colors;
  if (isJsonObject(colors)) {
    for (const [colorKey, colorValue] of Object.entries(colors)) {
      const normalized = normalizeThemeColor(colorValue);
      if (normalized) {
        mergedColors[colorKey] = normalized;
      }
    }
  }

  resolvingPath.delete(themePath);
  const resolvedTheme: ResolvedThemeData = { colors: mergedColors, tokenColors: mergedTokenColors };
  resolvedThemeCache.set(themePath, resolvedTheme);
  return resolvedTheme;
}

/**
 * `tokenColors` の参照パスを解決してエントリ配列へ展開する。
 *
 * @param {string} basePath 現在のテーマファイルパス。
 * @param {string} referencePath 参照先パス。
 * @param {Set<string>} resolvingPath 循環参照防止用セット。
 * @returns {TokenColorEntry[]} 展開済みトークンカラールール。
 */
function resolveTokenColorReference(
  basePath: string,
  referencePath: string,
  resolvingPath: Set<string>
): TokenColorEntry[] {
  const resolvedPath = resolveRelativeThemePath(basePath, referencePath);
  if (resolvingPath.has(resolvedPath)) {
    return [];
  }

  const source = THEME_SOURCE_BY_PATH[resolvedPath];
  if (!source) {
    console.warn(`[cpeditor] Unknown VSCode token color file: ${resolvedPath}`);
    return [];
  }

  resolvingPath.add(resolvedPath);
  const parsed = parseJsoncUnknown(source);
  const entries: TokenColorEntry[] = [];

  if (Array.isArray(parsed)) {
    entries.push(...resolveTokenColorEntries(resolvedPath, parsed, resolvingPath));
  } else if (isJsonObject(parsed)) {
    const includePath = getStringField(parsed, 'include');
    if (includePath) {
      entries.push(...resolveTokenColorReference(resolvedPath, includePath, resolvingPath));
    }

    const tokenColors = parsed.tokenColors;
    if (typeof tokenColors === 'string') {
      entries.push(...resolveTokenColorReference(resolvedPath, tokenColors, resolvingPath));
    } else if (Array.isArray(tokenColors)) {
      entries.push(...resolveTokenColorEntries(resolvedPath, tokenColors, resolvingPath));
    } else {
      const entry = toTokenColorEntry(parsed);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  resolvingPath.delete(resolvedPath);
  return entries;
}

/**
 * 生の `tokenColors` 配列をMonaco変換可能な形式へ整形する。
 *
 * @param {string} basePath 現在のテーマファイルパス。
 * @param {unknown[]} rawEntries 生のエントリ配列。
 * @param {Set<string>} resolvingPath 循環参照防止用セット。
 * @returns {TokenColorEntry[]} 整形済みエントリ配列。
 */
function resolveTokenColorEntries(basePath: string, rawEntries: unknown[], resolvingPath: Set<string>): TokenColorEntry[] {
  const entries: TokenColorEntry[] = [];
  for (const rawEntry of rawEntries) {
    if (!isJsonObject(rawEntry)) {
      continue;
    }

    const includePath = getStringField(rawEntry, 'include');
    if (includePath) {
      entries.push(...resolveTokenColorReference(basePath, includePath, resolvingPath));
      continue;
    }

    const entry = toTokenColorEntry(rawEntry);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * トークンカラーエントリへ変換可能なオブジェクトを整形する。
 *
 * @param {JsonObject} rawEntry 生のエントリオブジェクト。
 * @returns {TokenColorEntry | null} 変換後エントリ。変換不能ならnull。
 */
function toTokenColorEntry(rawEntry: JsonObject): TokenColorEntry | null {
  const scope = rawEntry.scope;
  const settings = rawEntry.settings;

  let normalizedScope: string | string[] | undefined;
  if (typeof scope === 'string' || Array.isArray(scope)) {
    normalizedScope = scope;
  }

  const normalizedSettings = toTokenColorSettings(settings);
  if (!normalizedScope && !normalizedSettings) {
    return null;
  }

  return {
    scope: normalizedScope,
    settings: normalizedSettings,
  };
}

/**
 * トークンカラー設定の文字列項目を安全な形式に整形する。
 *
 * @param {unknown} value 生の設定値。
 * @returns {TokenColorSettings | undefined} 整形済み設定。未設定ならundefined。
 */
function toTokenColorSettings(value: unknown): TokenColorSettings | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const foreground = getStringField(value, 'foreground');
  const background = getStringField(value, 'background');
  const fontStyle = getStringField(value, 'fontStyle');

  if (!foreground && !background && !fontStyle) {
    return undefined;
  }

  return {
    foreground,
    background,
    fontStyle,
  };
}

/**
 * トークンカラー1件をMonacoのトークンルール配列へ変換する。
 *
 * @param {TokenColorEntry} tokenColorEntry 変換対象エントリ。
 * @returns {MonacoEditorNamespace.ITokenThemeRule[]} Monacoトークンルール。
 */
function toMonacoTokenRules(tokenColorEntry: TokenColorEntry): MonacoEditorNamespace.ITokenThemeRule[] {
  const scopes = toScopesArray(tokenColorEntry.scope);
  const settings = tokenColorEntry.settings;

  const foreground = normalizeTokenColor(settings?.foreground);
  const background = normalizeTokenColor(settings?.background);
  const fontStyle = normalizeFontStyle(settings?.fontStyle);

  if (!foreground && !background && fontStyle === undefined) {
    return [];
  }

  const normalizedScopes = scopes.length > 0 ? scopes : [''];
  return normalizedScopes.map((scope) => ({
    token: scope,
    foreground,
    background,
    fontStyle,
  }));
}

/**
 * `scope` フィールドを配列形式へ正規化する。
 *
 * @param {string | string[] | undefined} scope 生のscope定義。
 * @returns {string[]} 正規化済みscope配列。
 */
function toScopesArray(scope: string | string[] | undefined): string[] {
  if (!scope) {
    return [];
  }

  const scopeValues = (Array.isArray(scope) ? scope : scope.split(',')).map((value) => value.trim()).filter(Boolean);
  return scopeValues;
}

/**
 * Monacoの `fontStyle` で利用可能な値へ正規化する。
 *
 * @param {string | undefined} fontStyle 生のfontStyle文字列。
 * @returns {string | undefined} 正規化後fontStyle。未設定はundefined。
 */
function normalizeFontStyle(fontStyle: string | undefined): string | undefined {
  if (typeof fontStyle !== 'string') {
    return undefined;
  }

  const normalized = fontStyle.trim().toLowerCase();
  if (!normalized || normalized === 'normal') {
    return '';
  }

  const allowedStyles = new Set(['italic', 'bold', 'underline', 'strikethrough']);
  const filtered = normalized.split(/\s+/).filter((style) => allowedStyles.has(style));
  if (filtered.length === 0) {
    return undefined;
  }

  return filtered.join(' ');
}

/**
 * テーマ色をMonacoのUIカラー形式（`#RRGGBB`/`#RRGGBBAA`）へ正規化する。
 *
 * @param {unknown} value 生の色文字列。
 * @returns {string | undefined} 正規化済みカラー。無効値はundefined。
 */
function normalizeThemeColor(value: unknown): string | undefined {
  const hex = normalizeHexDigits(value);
  return hex ? `#${hex}` : undefined;
}

/**
 * トークン色をMonacoトークンルール形式（`RRGGBB`/`RRGGBBAA`）へ正規化する。
 *
 * @param {unknown} value 生の色文字列。
 * @returns {string | undefined} 正規化済みカラー。無効値はundefined。
 */
function normalizeTokenColor(value: unknown): string | undefined {
  return normalizeHexDigits(value);
}

/**
 * 16進カラー文字列から `#` を除去し、桁数をMonaco互換へ整形する。
 *
 * @param {unknown} value 生の色文字列。
 * @returns {string | undefined} 整形済み16進文字列。無効値はundefined。
 */
function normalizeHexDigits(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  const prefixed = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(prefixed)) {
    return undefined;
  }

  if (prefixed.length === 3 || prefixed.length === 4) {
    const expanded = prefixed
      .split('')
      .map((digit) => `${digit}${digit}`)
      .join('');
    return expanded.toUpperCase();
  }

  if (prefixed.length !== 6 && prefixed.length !== 8) {
    return undefined;
  }

  return prefixed.toUpperCase();
}

/**
 * JSONC文字列をオブジェクトとして解析する。
 *
 * @param {string} source JSONC文字列。
 * @returns {JsonObject} 解析結果オブジェクト。オブジェクト以外は空オブジェクト。
 */
function parseJsoncObject(source: string): JsonObject {
  const parsed = parseJsoncUnknown(source);
  return isJsonObject(parsed) ? parsed : {};
}

/**
 * JSONC文字列をunknownとして解析する。
 *
 * @param {string} source JSONC文字列。
 * @returns {unknown} 解析結果。
 */
function parseJsoncUnknown(source: string): unknown {
  const withoutComments = stripJsonComments(source);
  const withoutTrailingCommas = stripTrailingCommas(withoutComments);
  return JSON.parse(withoutTrailingCommas) as unknown;
}

/**
 * JSONC内のコメントを除去する。
 *
 * @param {string} source 元文字列。
 * @returns {string} コメント除去後文字列。
 */
function stripJsonComments(source: string): string {
  let result = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let isEscaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (current === '\n' || current === '\r') {
        inLineComment = false;
        result += current;
      }
      continue;
    }

    if (inBlockComment) {
      if (current === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      result += current;
      if (isEscaped) {
        isEscaped = false;
      } else if (current === '\\') {
        isEscaped = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }

    if (current === '"') {
      inString = true;
      result += current;
      continue;
    }

    if (current === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    result += current;
  }

  return result;
}

/**
 * JSON文字列中の末尾カンマを除去する。
 *
 * @param {string} source 元文字列。
 * @returns {string} 末尾カンマ除去後文字列。
 */
function stripTrailingCommas(source: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];

    if (inString) {
      result += current;
      if (isEscaped) {
        isEscaped = false;
      } else if (current === '\\') {
        isEscaped = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }

    if (current === '"') {
      inString = true;
      result += current;
      continue;
    }

    if (current === ',') {
      let lookAhead = index + 1;
      while (lookAhead < source.length && /\s/.test(source[lookAhead])) {
        lookAhead += 1;
      }

      const nextSymbol = source[lookAhead];
      if (nextSymbol === '}' || nextSymbol === ']') {
        continue;
      }
    }

    result += current;
  }

  return result;
}

/**
 * 相対参照パスをテーマ定義ファイル基準の正規パスへ解決する。
 *
 * @param {string} basePath 基準となるファイルパス。
 * @param {string} relativePath 相対参照パス。
 * @returns {string} 正規化済みパス。
 */
function resolveRelativeThemePath(basePath: string, relativePath: string): string {
  const baseSegments = basePath.split('/');
  baseSegments.pop();

  const relativeSegments = relativePath.split('/');
  const mergedSegments = [...baseSegments];

  for (const segment of relativeSegments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      mergedSegments.pop();
      continue;
    }

    mergedSegments.push(segment);
  }

  return mergedSegments.join('/');
}

/**
 * 値がJSONオブジェクトか判定する。
 *
 * @param {unknown} value 判定対象値。
 * @returns {value is JsonObject} オブジェクトならtrue。
 */
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * オブジェクトの指定キーから文字列を安全に取得する。
 *
 * @param {JsonObject} target 取得対象オブジェクト。
 * @param {string} fieldName 取得対象キー。
 * @returns {string | undefined} 文字列値。文字列でなければundefined。
 */
function getStringField(target: JsonObject, fieldName: string): string | undefined {
  const value = target[fieldName];
  return typeof value === 'string' ? value : undefined;
}
