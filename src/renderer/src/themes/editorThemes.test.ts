import { describe, expect, it, vi } from 'vitest';
import { VSCODE_STANDARD_THEME_OPTIONS, getMonacoThemeName, registerVSCodeStandardThemes } from './editorThemes';

describe('registerVSCodeStandardThemes', () => {
  it('registers all bundled VSCode themes only once', () => {
    const defineTheme = vi.fn();
    registerVSCodeStandardThemes({ defineTheme });
    registerVSCodeStandardThemes({ defineTheme });

    expect(defineTheme).toHaveBeenCalledTimes(VSCODE_STANDARD_THEME_OPTIONS.length);

    for (const option of VSCODE_STANDARD_THEME_OPTIONS) {
      expect(defineTheme).toHaveBeenCalledWith(
        getMonacoThemeName(option.id),
        expect.objectContaining({
          base: option.uiTheme,
          inherit: true,
        })
      );
    }
  });
});
