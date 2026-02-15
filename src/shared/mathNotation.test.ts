import { describe, expect, it } from 'vitest';
import { normalizeAtCoderMathInHtml, normalizeAtCoderMathText } from './mathNotation';

describe('normalizeAtCoderMathText', () => {
  it('inequality commands are converted to symbols', () => {
    expect(normalizeAtCoderMathText('1 \\leq A \\le 10')).toBe('1 ≤ A ≤ 10');
    expect(normalizeAtCoderMathText('A + B \\geq 1')).toBe('A + B ≥ 1');
  });

  it('common commands used in AtCoder statements are converted', () => {
    expect(normalizeAtCoderMathText('2 \\times 10^5')).toBe('2 × 10^5');
    expect(normalizeAtCoderMathText('(i = 1, \\ldots, K)')).toBe('(i = 1, ..., K)');
  });
});

describe('normalizeAtCoderMathInHtml', () => {
  it('applies conversion only inside var elements', () => {
    const html = '<p>\\leq is raw text.</p><ul><li><var>1 \\leq A \\leq 10</var></li></ul>';
    const converted = normalizeAtCoderMathInHtml(html);

    expect(converted).toContain('<p>\\leq is raw text.</p>');
    expect(converted).toContain('<var>1 ≤ A ≤ 10</var>');
  });
});
