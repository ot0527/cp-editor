import { create } from 'zustand';

type LoopFactor = 'linear' | 'log' | 'constant';

export interface ComplexityCheckResult {
  expression: string;
  loopCount: number;
  maxLinearDepth: number;
  maxLogDepth: number;
  sortCallCount: number;
  note: string;
}

interface ComplexityStoreState {
  lastResult: ComplexityCheckResult | null;
  statusSummary: string;
}

interface ComplexityStoreActions {
  analyzeSourceCode: (sourceCode: string) => ComplexityCheckResult;
  clearResult: () => void;
}

type ComplexityStore = ComplexityStoreState & ComplexityStoreActions;

interface LoopMetrics {
  loopCount: number;
  maxLinearDepth: number;
  maxLogDepth: number;
}

const IDENTIFIER_PATTERN = /\b[A-Za-z_][A-Za-z0-9_]*\b/;
const CXX_RESERVED_WORDS = new Set([
  'alignas',
  'alignof',
  'and',
  'and_eq',
  'asm',
  'auto',
  'bitand',
  'bitor',
  'bool',
  'break',
  'case',
  'catch',
  'char',
  'char8_t',
  'char16_t',
  'char32_t',
  'class',
  'compl',
  'concept',
  'const',
  'consteval',
  'constexpr',
  'constinit',
  'const_cast',
  'continue',
  'co_await',
  'co_return',
  'co_yield',
  'decltype',
  'default',
  'delete',
  'do',
  'double',
  'dynamic_cast',
  'else',
  'enum',
  'explicit',
  'export',
  'extern',
  'false',
  'float',
  'for',
  'friend',
  'goto',
  'if',
  'inline',
  'int',
  'long',
  'mutable',
  'namespace',
  'new',
  'noexcept',
  'not',
  'not_eq',
  'nullptr',
  'operator',
  'or',
  'or_eq',
  'private',
  'protected',
  'public',
  'register',
  'reinterpret_cast',
  'requires',
  'return',
  'short',
  'signed',
  'sizeof',
  'static',
  'static_assert',
  'static_cast',
  'struct',
  'switch',
  'template',
  'this',
  'thread_local',
  'throw',
  'true',
  'try',
  'typedef',
  'typeid',
  'typename',
  'union',
  'unsigned',
  'using',
  'virtual',
  'void',
  'volatile',
  'wchar_t',
  'while',
  'xor',
  'xor_eq',
]);

/**
 * 文字が識別子に使えるか判定する。
 *
 * @param {string} value 判定対象1文字。
 * @returns {boolean} 識別子文字ならtrue。
 */
function isIdentifierChar(value: string): boolean {
  return /[A-Za-z0-9_]/.test(value);
}

/**
 * キーワードの前後が単語境界か判定する。
 *
 * @param {string} source 解析対象ソース。
 * @param {number} index キーワード開始位置。
 * @param {string} keyword 判定キーワード。
 * @returns {boolean} キーワード一致ならtrue。
 */
function isKeywordAt(source: string, index: number, keyword: string): boolean {
  if (!source.startsWith(keyword, index)) {
    return false;
  }

  const previous = index > 0 ? source[index - 1] : '';
  const next = index + keyword.length < source.length ? source[index + keyword.length] : '';
  return !isIdentifierChar(previous) && !isIdentifierChar(next);
}

/**
 * 指定位置から空白文字を読み飛ばす。
 *
 * @param {string} source 解析対象ソース。
 * @param {number} start 開始位置。
 * @returns {number} 次の非空白文字位置。
 */
function skipWhitespace(source: string, start: number): number {
  let cursor = start;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }

  return cursor;
}

/**
 * コメントと文字列/文字リテラルを除去して解析用ソースを作る。
 *
 * @param {string} source C++ソースコード。
 * @returns {string} 解析用ソース。
 */
function sanitizeSourceCode(source: string): string {
  let state: 'normal' | 'lineComment' | 'blockComment' | 'stringLiteral' | 'charLiteral' = 'normal';
  let escaped = false;
  let sanitized = '';

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = index + 1 < source.length ? source[index + 1] : '';

    if (state === 'normal') {
      if (current === '/' && next === '/') {
        state = 'lineComment';
        sanitized += '  ';
        index += 1;
        continue;
      }

      if (current === '/' && next === '*') {
        state = 'blockComment';
        sanitized += '  ';
        index += 1;
        continue;
      }

      if (current === '"') {
        state = 'stringLiteral';
        escaped = false;
        sanitized += ' ';
        continue;
      }

      if (current === "'") {
        state = 'charLiteral';
        escaped = false;
        sanitized += ' ';
        continue;
      }

      sanitized += current;
      continue;
    }

    if (state === 'lineComment') {
      if (current === '\n') {
        state = 'normal';
        sanitized += '\n';
      } else {
        sanitized += ' ';
      }
      continue;
    }

    if (state === 'blockComment') {
      if (current === '*' && next === '/') {
        state = 'normal';
        sanitized += '  ';
        index += 1;
        continue;
      }

      sanitized += current === '\n' ? '\n' : ' ';
      continue;
    }

    if (state === 'stringLiteral') {
      if (current === '\n') {
        sanitized += '\n';
        escaped = false;
        continue;
      }

      if (!escaped && current === '\\') {
        escaped = true;
        sanitized += ' ';
        continue;
      }

      if (!escaped && current === '"') {
        state = 'normal';
        sanitized += ' ';
        continue;
      }

      escaped = false;
      sanitized += ' ';
      continue;
    }

    if (state === 'charLiteral') {
      if (current === '\n') {
        sanitized += '\n';
        escaped = false;
        continue;
      }

      if (!escaped && current === '\\') {
        escaped = true;
        sanitized += ' ';
        continue;
      }

      if (!escaped && current === "'") {
        state = 'normal';
        sanitized += ' ';
        continue;
      }

      escaped = false;
      sanitized += ' ';
    }
  }

  return sanitized;
}

/**
 * 括弧で囲まれた文字列を抽出する。
 *
 * @param {string} source 解析対象ソース。
 * @param {number} openParenIndex `(` の位置。
 * @returns {{ content: string; endIndex: number } | null} 抽出結果。
 */
function readParenthesized(source: string, openParenIndex: number): { content: string; endIndex: number } | null {
  if (openParenIndex < 0 || openParenIndex >= source.length || source[openParenIndex] !== '(') {
    return null;
  }

  let depth = 1;
  let cursor = openParenIndex + 1;
  while (cursor < source.length && depth > 0) {
    const current = source[cursor];
    if (current === '(') {
      depth += 1;
    } else if (current === ')') {
      depth -= 1;
    }
    cursor += 1;
  }

  if (depth !== 0) {
    return null;
  }

  return {
    content: source.slice(openParenIndex + 1, cursor - 1),
    endIndex: cursor,
  };
}

/**
 * `for` ヘッダーを `init/condition/update` の3要素へ分解する。
 *
 * @param {string} header `for (...)` 内部文字列。
 * @returns {string[]} 分割結果。
 */
function splitForHeaderParts(header: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < header.length; index += 1) {
    const current = header[index];
    if (current === '(') {
      depth += 1;
      continue;
    }

    if (current === ')') {
      depth -= 1;
      continue;
    }

    if (current === ';' && depth === 0) {
      parts.push(header.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(header.slice(start));
  return parts;
}

/**
 * 式中に変数由来とみなせる識別子があるか判定する。
 *
 * @param {string} expression 判定式。
 * @returns {boolean} 変数識別子が含まれる場合true。
 */
function hasVariableIdentifier(expression: string): boolean {
  const matched = expression.match(IDENTIFIER_PATTERN);
  if (!matched) {
    return false;
  }

  return !CXX_RESERVED_WORDS.has(matched[0]);
}

/**
 * `for` ループヘッダーから反復特性を推定する。
 *
 * @param {string} header `for (...)` 内部文字列。
 * @returns {LoopFactor} 反復特性。
 */
function classifyForLoopFactor(header: string): LoopFactor {
  const parts = splitForHeaderParts(header);
  if (parts.length < 3) {
    return 'linear';
  }

  const condition = parts[1];
  const update = parts[2];

  if (/(\*=|\/=|>>=|<<=)/.test(update) || /\b[A-Za-z_][A-Za-z0-9_]*\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*[*\/]/.test(update)) {
    return 'log';
  }

  if (!hasVariableIdentifier(condition)) {
    return 'constant';
  }

  return 'linear';
}

/**
 * `while` ループ条件から反復特性を推定する。
 *
 * @param {string} header `while (...)` 内部文字列。
 * @returns {LoopFactor} 反復特性。
 */
function classifyWhileLoopFactor(header: string): LoopFactor {
  if (!hasVariableIdentifier(header)) {
    return 'constant';
  }

  if (/>>|<<|\/\s*2|\*\s*0\.5/.test(header)) {
    return 'log';
  }

  return 'linear';
}

/**
 * ループ入れ子深度を解析して推定用メトリクスを返す。
 *
 * @param {string} source 解析対象ソース。
 * @returns {LoopMetrics} 解析結果メトリクス。
 */
function analyzeLoopMetrics(source: string): LoopMetrics {
  const metrics: LoopMetrics = {
    loopCount: 0,
    maxLinearDepth: 0,
    maxLogDepth: 0,
  };

  /**
   * 深度情報の最大値を更新する。
   *
   * @param {number} linearDepth 線形ループ深度。
   * @param {number} logDepth 対数ループ深度。
   * @returns {void} 値は返さない。
   */
  function updateDepth(linearDepth: number, logDepth: number): void {
    metrics.maxLinearDepth = Math.max(metrics.maxLinearDepth, linearDepth);
    metrics.maxLogDepth = Math.max(metrics.maxLogDepth, logDepth);
  }

  /**
   * 通常文をセミコロン/ブロック終端まで読み飛ばす。
   *
   * @param {number} start 開始位置。
   * @param {number} linearDepth 現在の線形深度。
   * @param {number} logDepth 現在の対数深度。
   * @returns {number} 次の解析位置。
   */
  function consumeSimpleStatement(start: number, linearDepth: number, logDepth: number): number {
    let cursor = start;
    let parenthesisDepth = 0;
    let bracketDepth = 0;

    while (cursor < source.length) {
      const current = source[cursor];
      if (current === '(') {
        parenthesisDepth += 1;
      } else if (current === ')') {
        parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      } else if (current === '[') {
        bracketDepth += 1;
      } else if (current === ']') {
        bracketDepth = Math.max(0, bracketDepth - 1);
      } else if (parenthesisDepth === 0 && bracketDepth === 0) {
        if (current === ';') {
          return cursor + 1;
        }

        if (current === '{') {
          return parseBlock(cursor + 1, linearDepth, logDepth);
        }

        if (current === '}') {
          return cursor;
        }
      }
      cursor += 1;
    }

    return cursor;
  }

  /**
   * ループ1件を解析し、本文まで含めて読み進める。
   *
   * @param {number} afterKeyword ループキーワード直後位置。
   * @param {LoopFactor} factor ループ反復特性。
   * @param {number} linearDepth 親の線形深度。
   * @param {number} logDepth 親の対数深度。
   * @returns {number} 次の解析位置。
   */
  function parseLoop(afterKeyword: number, factor: LoopFactor, linearDepth: number, logDepth: number): number {
    const openParen = skipWhitespace(source, afterKeyword);
    const parsed = readParenthesized(source, openParen);
    if (!parsed) {
      return consumeSimpleStatement(afterKeyword, linearDepth, logDepth);
    }

    const nextLinearDepth = linearDepth + (factor === 'linear' ? 1 : 0);
    const nextLogDepth = logDepth + (factor === 'log' ? 1 : 0);
    metrics.loopCount += 1;
    updateDepth(nextLinearDepth, nextLogDepth);

    return parseStatement(parsed.endIndex, nextLinearDepth, nextLogDepth);
  }

  /**
   * 1つの文を解析して次位置を返す。
   *
   * @param {number} start 開始位置。
   * @param {number} linearDepth 現在の線形深度。
   * @param {number} logDepth 現在の対数深度。
   * @returns {number} 次の解析位置。
   */
  function parseStatement(start: number, linearDepth: number, logDepth: number): number {
    const cursor = skipWhitespace(source, start);
    if (cursor >= source.length) {
      return cursor;
    }

    if (source[cursor] === '{') {
      return parseBlock(cursor + 1, linearDepth, logDepth);
    }

    if (isKeywordAt(source, cursor, 'for')) {
      const openParen = skipWhitespace(source, cursor + 3);
      const parsed = readParenthesized(source, openParen);
      const factor = parsed ? classifyForLoopFactor(parsed.content) : 'linear';
      return parseLoop(cursor + 3, factor, linearDepth, logDepth);
    }

    if (isKeywordAt(source, cursor, 'while')) {
      const openParen = skipWhitespace(source, cursor + 5);
      const parsed = readParenthesized(source, openParen);
      const factor = parsed ? classifyWhileLoopFactor(parsed.content) : 'linear';
      return parseLoop(cursor + 5, factor, linearDepth, logDepth);
    }

    if (isKeywordAt(source, cursor, 'do')) {
      const nextLinearDepth = linearDepth + 1;
      metrics.loopCount += 1;
      updateDepth(nextLinearDepth, logDepth);

      let next = parseStatement(cursor + 2, nextLinearDepth, logDepth);
      next = skipWhitespace(source, next);
      if (!isKeywordAt(source, next, 'while')) {
        return next;
      }

      const openParen = skipWhitespace(source, next + 5);
      const parsed = readParenthesized(source, openParen);
      if (!parsed) {
        return consumeSimpleStatement(next + 5, linearDepth, logDepth);
      }

      const statementEnd = skipWhitespace(source, parsed.endIndex);
      if (statementEnd < source.length && source[statementEnd] === ';') {
        return statementEnd + 1;
      }

      return statementEnd;
    }

    if (isKeywordAt(source, cursor, 'if')) {
      const openParen = skipWhitespace(source, cursor + 2);
      const parsed = readParenthesized(source, openParen);
      if (!parsed) {
        return consumeSimpleStatement(cursor + 2, linearDepth, logDepth);
      }

      let next = parseStatement(parsed.endIndex, linearDepth, logDepth);
      const elseIndex = skipWhitespace(source, next);
      if (isKeywordAt(source, elseIndex, 'else')) {
        next = parseStatement(elseIndex + 4, linearDepth, logDepth);
      }

      return next;
    }

    if (isKeywordAt(source, cursor, 'else')) {
      return parseStatement(cursor + 4, linearDepth, logDepth);
    }

    if (isKeywordAt(source, cursor, 'switch')) {
      const openParen = skipWhitespace(source, cursor + 6);
      const parsed = readParenthesized(source, openParen);
      if (!parsed) {
        return consumeSimpleStatement(cursor + 6, linearDepth, logDepth);
      }

      return parseStatement(parsed.endIndex, linearDepth, logDepth);
    }

    return consumeSimpleStatement(cursor, linearDepth, logDepth);
  }

  /**
   * ブロック文を解析して閉じ括弧の後ろへ進める。
   *
   * @param {number} start 開始位置（`{` の次）。
   * @param {number} linearDepth 現在の線形深度。
   * @param {number} logDepth 現在の対数深度。
   * @returns {number} 次の解析位置。
   */
  function parseBlock(start: number, linearDepth: number, logDepth: number): number {
    let cursor = start;
    while (cursor < source.length) {
      const next = skipWhitespace(source, cursor);
      if (next >= source.length) {
        return next;
      }

      if (source[next] === '}') {
        return next + 1;
      }

      const parsed = parseStatement(next, linearDepth, logDepth);
      cursor = parsed > next ? parsed : next + 1;
    }

    return cursor;
  }

  let cursor = 0;
  while (cursor < source.length) {
    const parsed = parseStatement(cursor, 0, 0);
    cursor = parsed > cursor ? parsed : cursor + 1;
  }

  return metrics;
}

/**
 * 線形/対数の深度から O 記法文字列を組み立てる。
 *
 * @param {number} linearDepth 線形深度。
 * @param {number} logDepth 対数深度。
 * @returns {string} O記法文字列。
 */
function buildBigONotation(linearDepth: number, logDepth: number): string {
  const parts: string[] = [];

  if (linearDepth > 0) {
    parts.push(linearDepth === 1 ? 'N' : `N^${linearDepth}`);
  }

  if (logDepth > 0) {
    parts.push(logDepth === 1 ? 'log N' : `(log N)^${logDepth}`);
  }

  if (parts.length === 0) {
    return 'O(1)';
  }

  return `O(${parts.join(' * ')})`;
}

/**
 * ステータスバー向け要約テキストを生成する。
 *
 * @param {ComplexityCheckResult} result 解析結果。
 * @returns {string} 要約文字列。
 */
function toStatusSummary(result: ComplexityCheckResult): string {
  const suffix = result.sortCallCount > 0 ? ` / sort:${result.sortCallCount}` : '';
  return `${result.expression} / loop:${result.loopCount}${suffix}`;
}

/**
 * 計算量チェッカー状態を管理するZustandストア。
 */
export const useComplexityStore = create<ComplexityStore>((set) => ({
  lastResult: null,
  statusSummary: '未解析',

  /**
   * ソースコードを静的解析して計算量を推定する。
   *
   * @param {string} sourceCode C++ソースコード。
   * @returns {ComplexityCheckResult} 推定結果。
   */
  analyzeSourceCode: (sourceCode: string): ComplexityCheckResult => {
    const normalized = sourceCode.replace(/\r\n/g, '\n');
    const sanitized = sanitizeSourceCode(normalized);
    const loopMetrics = analyzeLoopMetrics(sanitized);
    const sortCallCount = (sanitized.match(/\b(?:std::)?sort\s*\(/g) ?? []).length;

    let expression = buildBigONotation(loopMetrics.maxLinearDepth, loopMetrics.maxLogDepth);
    if (loopMetrics.loopCount === 0 && sortCallCount > 0) {
      expression = 'O(N log N)';
    }

    const noteParts = ['静的解析による推定値です。'];
    if (sortCallCount > 0) {
      noteParts.push(`sort呼び出しを ${sortCallCount} 件検出しました。`);
    }
    if (loopMetrics.loopCount === 0 && sortCallCount === 0) {
      noteParts.push('ループとsort呼び出しは検出されませんでした。');
    }

    const result: ComplexityCheckResult = {
      expression,
      loopCount: loopMetrics.loopCount,
      maxLinearDepth: loopMetrics.maxLinearDepth,
      maxLogDepth: loopMetrics.maxLogDepth,
      sortCallCount,
      note: noteParts.join(' '),
    };

    set({
      lastResult: result,
      statusSummary: toStatusSummary(result),
    });

    return result;
  },

  /**
   * 計算量の解析結果を初期状態へ戻す。
   *
   * @returns {void} 値は返さない。
   */
  clearResult: (): void => {
    set({
      lastResult: null,
      statusSummary: '未解析',
    });
  },
}));
