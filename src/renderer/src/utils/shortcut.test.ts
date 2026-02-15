import { describe, expect, it } from 'vitest';
import { isValidShortcutBinding, normalizeShortcutBinding } from './shortcut';

describe('normalizeShortcutBinding', () => {
  it('normalizes aliases and key case', () => {
    expect(normalizeShortcutBinding('control + shift + s')).toBe('Ctrl+Shift+S');
    expect(normalizeShortcutBinding('cmd + enter')).toBe('Meta+Enter');
    expect(normalizeShortcutBinding('alt + escape')).toBe('Alt+Escape');
    expect(normalizeShortcutBinding('ctrl + plus')).toBe('Ctrl+Plus');
  });

  it('rejects invalid combinations', () => {
    expect(normalizeShortcutBinding('')).toBeNull();
    expect(normalizeShortcutBinding('Enter')).toBeNull();
    expect(normalizeShortcutBinding('Ctrl+Shift')).toBeNull();
    expect(normalizeShortcutBinding('Ctrl+Shift+A+B')).toBeNull();
    expect(normalizeShortcutBinding('Ctrl+Meta+Alt+Shift+Control')).toBeNull();
  });
});

describe('isValidShortcutBinding', () => {
  it('returns true only for valid bindings', () => {
    expect(isValidShortcutBinding('Ctrl+Enter')).toBe(true);
    expect(isValidShortcutBinding('Meta+F12')).toBe(true);
    expect(isValidShortcutBinding('F5')).toBe(false);
    expect(isValidShortcutBinding('Shift')).toBe(false);
  });
});
