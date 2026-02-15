import { describe, expect, it } from 'vitest';
import { difficultyBandToColor, toDifficultyBand } from './problemMeta';

describe('toDifficultyBand', () => {
  it('invalid values should map to 不明', () => {
    expect(toDifficultyBand(null)).toBe('不明');
    expect(toDifficultyBand(undefined)).toBe('不明');
    expect(toDifficultyBand(-1)).toBe('不明');
    expect(toDifficultyBand(Number.NaN)).toBe('不明');
  });

  it('boundary values should map to expected bands', () => {
    expect(toDifficultyBand(0)).toBe('灰');
    expect(toDifficultyBand(399)).toBe('灰');
    expect(toDifficultyBand(400)).toBe('茶');
    expect(toDifficultyBand(799)).toBe('茶');
    expect(toDifficultyBand(800)).toBe('緑');
    expect(toDifficultyBand(1199)).toBe('緑');
    expect(toDifficultyBand(1200)).toBe('水');
    expect(toDifficultyBand(1599)).toBe('水');
    expect(toDifficultyBand(1600)).toBe('青');
    expect(toDifficultyBand(1999)).toBe('青');
    expect(toDifficultyBand(2000)).toBe('黄');
    expect(toDifficultyBand(2399)).toBe('黄');
    expect(toDifficultyBand(2400)).toBe('橙');
    expect(toDifficultyBand(2799)).toBe('橙');
    expect(toDifficultyBand(2800)).toBe('赤');
  });
});

describe('difficultyBandToColor', () => {
  it('returns mapped color for each band', () => {
    expect(difficultyBandToColor('灰')).toBe('#808080');
    expect(difficultyBandToColor('茶')).toBe('#804000');
    expect(difficultyBandToColor('緑')).toBe('#008000');
    expect(difficultyBandToColor('水')).toBe('#00C0C0');
    expect(difficultyBandToColor('青')).toBe('#0000FF');
    expect(difficultyBandToColor('黄')).toBe('#C0C000');
    expect(difficultyBandToColor('橙')).toBe('#FF8000');
    expect(difficultyBandToColor('赤')).toBe('#FF0000');
    expect(difficultyBandToColor('不明')).toBe('#94A3B8');
  });
});
