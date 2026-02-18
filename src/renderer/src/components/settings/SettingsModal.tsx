import { useEffect, useState, type ChangeEvent } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  SHORTCUT_DEFINITIONS,
  shortcutFromKeyboardEvent,
  type ShortcutAction,
} from '../../utils/shortcut';
import { VSCODE_STANDARD_THEME_OPTIONS, isEditorThemeId } from '../../themes/editorThemes';

type SettingsModalProps = {
  /** モーダル表示状態。 */
  isOpen: boolean;
  /** モーダルを閉じる処理。 */
  onClose: () => void;
};

/**
 * 設定モーダル画面を描画する。
 *
 * @param {SettingsModalProps} props 開閉状態と閉じる処理。
 * @returns {JSX.Element | null} モーダル要素。非表示時はnull。
 */
function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const editorThemeId = useSettingsStore((state) => state.editorThemeId);
  const editorFontSize = useSettingsStore((state) => state.editorFontSize);
  const lineNumbersEnabled = useSettingsStore((state) => state.lineNumbersEnabled);
  const minimapEnabled = useSettingsStore((state) => state.minimapEnabled);
  const wordWrapEnabled = useSettingsStore((state) => state.wordWrapEnabled);
  const vimModeEnabled = useSettingsStore((state) => state.vimModeEnabled);
  const problemTemplate = useSettingsStore((state) => state.problemTemplate);
  const shortcuts = useSettingsStore((state) => state.shortcuts);
  const setEditorThemeId = useSettingsStore((state) => state.setEditorThemeId);
  const setEditorFontSize = useSettingsStore((state) => state.setEditorFontSize);
  const setLineNumbersEnabled = useSettingsStore((state) => state.setLineNumbersEnabled);
  const setMinimapEnabled = useSettingsStore((state) => state.setMinimapEnabled);
  const setWordWrapEnabled = useSettingsStore((state) => state.setWordWrapEnabled);
  const setVimModeEnabled = useSettingsStore((state) => state.setVimModeEnabled);
  const setProblemTemplate = useSettingsStore((state) => state.setProblemTemplate);
  const resetProblemTemplate = useSettingsStore((state) => state.resetProblemTemplate);
  const setShortcutBinding = useSettingsStore((state) => state.setShortcutBinding);
  const resetShortcutBinding = useSettingsStore((state) => state.resetShortcutBinding);
  const resetAllSettings = useSettingsStore((state) => state.resetAllSettings);
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setRecordingAction(null);
      return;
    }

    /**
     * モーダル表示中のEscapeで閉じる。
     *
     * @param {KeyboardEvent} event キーボードイベント。
     * @returns {void} 値は返さない。
     */
    function handleCloseByEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || recordingAction) {
        return;
      }

      event.preventDefault();
      onClose();
    }

    window.addEventListener('keydown', handleCloseByEscape, true);
    return () => {
      window.removeEventListener('keydown', handleCloseByEscape, true);
    };
  }, [isOpen, onClose, recordingAction]);

  useEffect(() => {
    if (!isOpen || !recordingAction) {
      return;
    }

    const targetAction = recordingAction;

    /**
     * ショートカット録音中のキー入力を捕捉して保存する。
     *
     * @param {KeyboardEvent} event キーボードイベント。
     * @returns {void} 値は返さない。
     */
    function handleRecordShortcut(event: KeyboardEvent): void {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecordingAction(null);
        return;
      }

      const shortcut = shortcutFromKeyboardEvent(event);
      if (!shortcut) {
        return;
      }

      setShortcutBinding(targetAction, shortcut);
      setRecordingAction(null);
    }

    window.addEventListener('keydown', handleRecordShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleRecordShortcut, true);
    };
  }, [isOpen, recordingAction, setShortcutBinding]);

  if (!isOpen) {
    return null;
  }

  /**
   * 背景クリック時にモーダルを閉じる。
   *
   * @returns {void} 値は返さない。
   */
  function handleBackdropClick(): void {
    if (recordingAction) {
      setRecordingAction(null);
    }
  }

  /**
   * テーマ選択コンボボックスの変更を設定へ反映する。
   *
   * @param {ChangeEvent<HTMLSelectElement>} event セレクト変更イベント。
   * @returns {void} 値は返さない。
   */
  function handleEditorThemeChange(event: ChangeEvent<HTMLSelectElement>): void {
    const nextThemeId = event.target.value;
    if (!isEditorThemeId(nextThemeId)) {
      return;
    }

    setEditorThemeId(nextThemeId);
  }

  return (
    <div className="settings-backdrop" onClick={handleBackdropClick} role="presentation">
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="設定"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <div>
            <h2 className="settings-title">設定</h2>
            <p className="settings-subtitle">ショートカット・テンプレート・Vimモードをカスタマイズできます。</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            閉じる
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-section">
            <h3 className="settings-section-title">エディタ表示</h3>
            <div className="settings-grid">
              <label className="settings-field">
                <span>テーマ</span>
                <select className="compact-input settings-select" value={editorThemeId} onChange={handleEditorThemeChange}>
                  {VSCODE_STANDARD_THEME_OPTIONS.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field">
                <span>フォントサイズ</span>
                <input
                  type="number"
                  min={10}
                  max={32}
                  className="compact-input"
                  value={editorFontSize}
                  onChange={(event) => setEditorFontSize(Number(event.target.value))}
                />
              </label>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={lineNumbersEnabled}
                  onChange={(event) => setLineNumbersEnabled(event.target.checked)}
                />
                <span>行番号を表示する</span>
              </label>

              <label className="settings-check">
                <input type="checkbox" checked={minimapEnabled} onChange={(event) => setMinimapEnabled(event.target.checked)} />
                <span>ミニマップを表示する</span>
              </label>

              <label className="settings-check">
                <input type="checkbox" checked={wordWrapEnabled} onChange={(event) => setWordWrapEnabled(event.target.checked)} />
                <span>長い行を折り返す</span>
              </label>

              <label className="settings-check">
                <input type="checkbox" checked={vimModeEnabled} onChange={(event) => setVimModeEnabled(event.target.checked)} />
                <span>Vimモードを有効にする（monaco-vim）</span>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">ショートカット</h3>
            <div className="shortcut-list">
              {SHORTCUT_DEFINITIONS.map((definition) => (
                <div key={definition.action} className="shortcut-row">
                  <div className="shortcut-meta">
                    <strong>{definition.label}</strong>
                    <small>{definition.description}</small>
                  </div>
                  <code className="shortcut-binding">{shortcuts[definition.action]}</code>
                  <button
                    type="button"
                    className={`ghost-button${recordingAction === definition.action ? ' active' : ''}`}
                    onClick={() => setRecordingAction(recordingAction === definition.action ? null : definition.action)}
                  >
                    {recordingAction === definition.action ? '入力待ち' : 'キー入力'}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => resetShortcutBinding(definition.action)}>
                    リセット
                  </button>
                </div>
              ))}
            </div>
            {recordingAction ? (
              <p className="settings-hint">ショートカットを入力してください（終了: Esc）。修飾キーなしの単体キーは設定できません。</p>
            ) : (
              <p className="settings-hint">`Ctrl` / `Shift` / `Alt` / `Meta` を組み合わせて設定できます。</p>
            )}
          </section>

          <section className="settings-section">
            <h3 className="settings-section-title">テンプレート</h3>

            <label className="settings-field vertical">
              <span>問題選択時テンプレート</span>
              <textarea
                className="settings-textarea template"
                value={problemTemplate}
                onChange={(event) => setProblemTemplate(event.target.value)}
                spellCheck={false}
              />
            </label>
            <div className="settings-inline-actions">
              <button type="button" className="ghost-button" onClick={resetProblemTemplate}>
                テンプレートを初期化
              </button>
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          <button type="button" className="ghost-button danger" onClick={resetAllSettings}>
            すべて初期値へ戻す
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            完了
          </button>
        </footer>
      </section>
    </div>
  );
}

export default SettingsModal;
