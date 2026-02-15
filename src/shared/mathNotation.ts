interface ParsedSegment {
  html: string;
  index: number;
}

const COMMAND_MAP: Readonly<Record<string, string>> = {
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  times: '×',
  cdot: '·',
  fallingdotseq: '≒',
  ldots: '...',
  dots: '...',
  cdots: '⋯',
  vdots: '⋮',
  min: 'min',
  max: 'max',
};

const FORMAT_COMMANDS = new Set([
  'left',
  'right',
  'big',
  'Big',
  'bigl',
  'bigr',
  'Bigl',
  'Bigr',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function skipWhitespace(input: string, index: number): number {
  let cursor = index;
  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function parseMathExpression(input: string, startIndex: number, stopAtBrace: boolean): ParsedSegment {
  let html = '';
  let cursor = startIndex;

  while (cursor < input.length) {
    const current = input[cursor];

    if (stopAtBrace && current === '}') {
      break;
    }

    const atom = parseAtom(input, cursor);
    const scripted = appendScripts(input, atom.index, atom.html);
    html += scripted.html;
    cursor = scripted.index;
  }

  return { html, index: cursor };
}

function parseGroup(input: string, startIndex: number): ParsedSegment {
  const inner = parseMathExpression(input, startIndex + 1, true);
  const hasClosingBrace = inner.index < input.length && input[inner.index] === '}';

  return {
    html: inner.html,
    index: hasClosingBrace ? inner.index + 1 : inner.index,
  };
}

function parseScriptArgument(input: string, startIndex: number): ParsedSegment {
  const cursor = skipWhitespace(input, startIndex);
  if (cursor >= input.length) {
    return { html: '', index: cursor };
  }

  if (input[cursor] === '{') {
    return parseGroup(input, cursor);
  }

  if (input[cursor] === '\\') {
    return parseCommand(input, cursor);
  }

  return {
    html: escapeHtml(input[cursor]),
    index: cursor + 1,
  };
}

function appendScripts(input: string, startIndex: number, baseHtml: string): ParsedSegment {
  let cursor = startIndex;
  const scripts: string[] = [];

  while (cursor < input.length) {
    const operator = input[cursor];
    if (operator !== '_' && operator !== '^') {
      break;
    }

    const argument = parseScriptArgument(input, cursor + 1);
    scripts.push(operator === '_' ? `<sub>${argument.html}</sub>` : `<sup>${argument.html}</sup>`);
    cursor = argument.index;
  }

  return {
    html: `${baseHtml}${scripts.join('')}`,
    index: cursor,
  };
}

function parseCommand(input: string, startIndex: number): ParsedSegment {
  if (startIndex + 1 >= input.length) {
    return { html: '\\', index: startIndex + 1 };
  }

  const next = input[startIndex + 1];
  if (!/[A-Za-z]/.test(next)) {
    if (next === '\\') {
      return { html: ' ', index: startIndex + 2 };
    }

    if (next === ',' || next === ';' || next === ':' || next === '!' || next === ' ') {
      return { html: ' ', index: startIndex + 2 };
    }

    return { html: escapeHtml(next), index: startIndex + 2 };
  }

  let cursor = startIndex + 1;
  while (cursor < input.length && /[A-Za-z]/.test(input[cursor])) {
    cursor += 1;
  }

  const command = input.slice(startIndex + 1, cursor);
  if (FORMAT_COMMANDS.has(command)) {
    return { html: '', index: cursor };
  }

  if (command === 'frac') {
    const numerator = parseScriptArgument(input, cursor);
    const denominator = parseScriptArgument(input, numerator.index);
    return {
      html: `(${numerator.html})/(${denominator.html})`,
      index: denominator.index,
    };
  }

  if (command === 'sqrt') {
    const radicand = parseScriptArgument(input, cursor);
    return {
      html: `√(${radicand.html})`,
      index: radicand.index,
    };
  }

  const mapped = COMMAND_MAP[command];
  if (mapped != null) {
    return { html: escapeHtml(mapped), index: cursor };
  }

  return {
    html: escapeHtml(`\\${command}`),
    index: cursor,
  };
}

function parseAtom(input: string, startIndex: number): ParsedSegment {
  const current = input[startIndex];

  if (current === '{') {
    const grouped = parseGroup(input, startIndex);
    return {
      html: `{${grouped.html}}`,
      index: grouped.index,
    };
  }

  if (current === '\\') {
    return parseCommand(input, startIndex);
  }

  return {
    html: escapeHtml(current),
    index: startIndex + 1,
  };
}

/**
 * AtCoder問題文でよく使われるTeX記法を、読みやすいプレーンテキストへ置換する。
 *
 * @param {string} text 変換対象文字列。
 * @returns {string} 変換後文字列。
 */
export function normalizeAtCoderMathText(text: string): string {
  const parsed = parseMathExpression(text, 0, false).html;
  return parsed.replace(/[ \t]{2,}/g, ' ');
}

/**
 * HTML内の <var> 要素だけに TeX 記号置換を適用する。
 *
 * @param {string} html 変換対象HTML。
 * @returns {string} 変換後HTML。
 */
export function normalizeAtCoderMathInHtml(html: string): string {
  return html.replace(/<var\b([^>]*)>([\s\S]*?)<\/var>/gi, (_, attributes: string, value: string) => {
    if (/<\/?(sub|sup)\b/i.test(value)) {
      return `<var${attributes}>${value}</var>`;
    }

    return `<var${attributes}>${normalizeAtCoderMathText(value)}</var>`;
  });
}
