import { describe, expect, it } from 'vitest';
import { normalizeAtCoderMathInHtml, normalizeAtCoderMathText } from './mathNotation';

describe('normalizeAtCoderMathText', () => {
  it('inequality commands are converted to symbols', () => {
    expect(normalizeAtCoderMathText('1 \\leq A \\le 10')).toBe('1 ≤ A ≤ 10');
    expect(normalizeAtCoderMathText('A + B \\geq 1')).toBe('A + B ≥ 1');
  });

  it('common commands used in AtCoder statements are converted', () => {
    expect(normalizeAtCoderMathText('2 \\times 10^5')).toBe('2 × 10<sup>5</sup>');
    expect(normalizeAtCoderMathText('(i = 1, \\ldots, K)')).toBe('(i = 1, ..., K)');
    expect(normalizeAtCoderMathText('M_1 + M_2 + \\cdots + M_N')).toBe('M<sub>1</sub> + M<sub>2</sub> + ⋯ + M<sub>N</sub>');
  });

  it('renders subscript/superscript and simple structural commands', () => {
    expect(normalizeAtCoderMathText('P_1')).toBe('P<sub>1</sub>');
    expect(normalizeAtCoderMathText('S_{p+1}')).toBe('S<sub>p+1</sub>');
    expect(normalizeAtCoderMathText('10^{-6}')).toBe('10<sup>-6</sup>');
    expect(normalizeAtCoderMathText('\\frac{A}{\\sqrt{g}}')).toBe('(A)/(√(g))');
    expect(normalizeAtCoderMathText('{P_1, P_2, ..., P_N}')).toBe(
      '{P<sub>1</sub>, P<sub>2</sub>, ..., P<sub>N</sub>}'
    );
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
