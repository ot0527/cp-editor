const LATEX_TEXT_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\\leq\b/g, '≤'],
  [/\\le\b/g, '≤'],
  [/\\geq\b/g, '≥'],
  [/\\ge\b/g, '≥'],
  [/\\neq\b/g, '≠'],
  [/\\times\b/g, '×'],
  [/\\cdot\b/g, '·'],
  [/\\fallingdotseq\b/g, '≒'],
  [/\\ldots\b/g, '...'],
  [/\\dots\b/g, '...'],
  [/\\vdots\b/g, '⋮'],
  [/\\\{/g, '{'],
  [/\\\}/g, '}'],
  [/\\\\/g, ' '],
  [/\\,/g, ' '],
  [/\\ /g, ' '],
];

/**
 * AtCoder問題文でよく使われるTeX記法を、読みやすいプレーンテキストへ置換する。
 *
 * @param {string} text 変換対象文字列。
 * @returns {string} 変換後文字列。
 */
export function normalizeAtCoderMathText(text: string): string {
  let normalized = text;

  for (const [pattern, replacement] of LATEX_TEXT_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
}

/**
 * HTML内の <var> 要素だけに TeX 記号置換を適用する。
 *
 * @param {string} html 変換対象HTML。
 * @returns {string} 変換後HTML。
 */
export function normalizeAtCoderMathInHtml(html: string): string {
  return html.replace(/<var\b([^>]*)>([\s\S]*?)<\/var>/gi, (_, attributes: string, value: string) => {
    return `<var${attributes}>${normalizeAtCoderMathText(value)}</var>`;
  });
}
