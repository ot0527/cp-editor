import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { editor as MonacoEditorNamespace } from 'monaco-editor';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { matchesShortcut } from '../../utils/shortcut';

type CodeEditorProps = {
  /** Monacoに適用するテーマ。 */
  theme: 'light' | 'dark';
  /** 現在選択中の問題ID。 */
  problemId?: string;
  /** 現在選択中の問題タイトル。 */
  problemTitle?: string;
  /** サンプルテスト実行要求時の処理。 */
  onRunSampleTests: () => void;
  /** サンプルテスト実行中フラグ。 */
  isRunningTests: boolean;
  /** タイマー開始処理。 */
  onTimerStart: () => void;
  /** タイマー一時停止処理。 */
  onTimerPause: () => void;
  /** タイマーリセット処理。 */
  onTimerReset: () => void;
};

interface VimModeController {
  dispose: () => void;
}

interface MonacoVimModule {
  initVimMode?: (editor: MonacoEditorNamespace.IStandaloneCodeEditor, statusNode: HTMLElement) => VimModeController;
}

const MONACO_VIM_MODULE_NAME = 'monaco-vim';

loader.config({ monaco });

/**
 * フォーム入力中など、グローバルショートカットを無視するべき対象か判定する。
 *
 * @param {EventTarget | null} target イベントターゲット。
 * @returns {boolean} 無視するべき場合はtrue。
 */
function shouldIgnoreShortcutTarget(target: EventTarget | null): boolean {
  if (document.querySelector('.settings-backdrop')) {
    return true;
  }

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest('.monaco-editor')) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

/**
 * Monaco Editor を表示し、C++コードの編集状態を管理する。
 *
 * @param {CodeEditorProps} props エディタに適用する表示テーマと問題情報。
 * @returns {JSX.Element} コードエディタパネル要素を返す。
 */
function CodeEditor({
  theme,
  problemId,
  problemTitle,
  onRunSampleTests,
  isRunningTests,
  onTimerStart,
  onTimerPause,
  onTimerReset,
}: CodeEditorProps) {
  const code = useEditorStore((state) => state.code);
  const setCode = useEditorStore((state) => state.setCode);
  const resetCodeForProblem = useEditorStore((state) => state.resetCodeForProblem);
  const editorFontSize = useSettingsStore((state) => state.editorFontSize);
  const lineNumbersEnabled = useSettingsStore((state) => state.lineNumbersEnabled);
  const minimapEnabled = useSettingsStore((state) => state.minimapEnabled);
  const wordWrapEnabled = useSettingsStore((state) => state.wordWrapEnabled);
  const vimModeEnabled = useSettingsStore((state) => state.vimModeEnabled);
  const quickSnippet = useSettingsStore((state) => state.quickSnippet);
  const shortcuts = useSettingsStore((state) => state.shortcuts);
  const editorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(null);
  const vimModeControllerRef = useRef<VimModeController | null>(null);
  const vimStatusRef = useRef<HTMLDivElement | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [vimModeErrorMessage, setVimModeErrorMessage] = useState<string | null>(null);

  const options = useMemo(
    () => ({
      minimap: { enabled: minimapEnabled },
      fontSize: editorFontSize,
      fontLigatures: true,
      lineNumbers: lineNumbersEnabled ? ('on' as const) : ('off' as const),
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      wordWrap: wordWrapEnabled ? ('on' as const) : ('off' as const),
    }),
    [editorFontSize, lineNumbersEnabled, minimapEnabled, wordWrapEnabled]
  );

  useEffect(() => {
    resetCodeForProblem(problemId, problemTitle);
  }, [problemId, problemTitle, resetCodeForProblem]);

  /**
   * 有効化中のVimモードコントローラを破棄する。
   *
   * @returns {void} 値は返さない。
   */
  const disposeVimModeController = useCallback((): void => {
    if (!vimModeControllerRef.current) {
      return;
    }

    vimModeControllerRef.current.dispose();
    vimModeControllerRef.current = null;

    if (vimStatusRef.current) {
      vimStatusRef.current.textContent = '';
    }
  }, []);

  /**
   * クイックスニペットを現在カーソル位置へ挿入する。
   *
   * @returns {void} 値は返さない。
   */
  const insertQuickSnippet = useCallback((): void => {
    const normalizedSnippet = quickSnippet.replace(/\r\n/g, '\n');
    if (!normalizedSnippet.trim()) {
      return;
    }

    const snippetText = normalizedSnippet.endsWith('\n') ? normalizedSnippet : `${normalizedSnippet}\n`;
    const editor = editorRef.current;
    if (!editor) {
      const prefix = code.length === 0 || code.endsWith('\n') ? code : `${code}\n`;
      setCode(`${prefix}${snippetText}`);
      return;
    }

    const selection = editor.getSelection();
    if (!selection) {
      return;
    }

    editor.executeEdits('cpeditor.insertSnippet', [
      {
        range: selection,
        text: snippetText,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
  }, [code, quickSnippet, setCode]);

  /**
   * 現在のソースコードを整形し、エディタへ反映する。
   *
   * @returns {Promise<void>} 値は返さない。
   */
  const formatCode = useCallback(async (): Promise<void> => {
    if (isFormatting) {
      return;
    }

    const initialModel = editorRef.current?.getModel() ?? null;
    const sourceCode = initialModel?.getValue() ?? code;
    const sourceVersionId = initialModel?.getVersionId() ?? null;
    setIsFormatting(true);

    try {
      const response = await window.cpeditor.compiler.formatSource({
        sourceCode,
      });
      if (!response.success) {
        console.warn(`[cpeditor] ${response.errorMessage}`);
        return;
      }

      const editor = editorRef.current;
      if (!editor) {
        setCode(response.formattedCode);
        return;
      }

      const model = editor.getModel();
      if (sourceVersionId != null && model && model.getVersionId() !== sourceVersionId) {
        return;
      }

      if (!model || model.getValue() === response.formattedCode) {
        return;
      }

      editor.pushUndoStop();
      editor.executeEdits('cpeditor.formatCode', [
        {
          range: model.getFullModelRange(),
          text: response.formattedCode,
          forceMoveMarkers: true,
        },
      ]);
      editor.pushUndoStop();
      editor.focus();
    } finally {
      setIsFormatting(false);
    }
  }, [code, isFormatting, setCode]);

  useEffect(() => {
    /**
     * 設定済みショートカットを評価して対応アクションを実行する。
     *
     * @param {KeyboardEvent} event キーボードイベント。
     * @returns {void} 値は返さない。
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (shouldIgnoreShortcutTarget(event.target)) {
        return;
      }

      if (matchesShortcut(event, shortcuts.runSampleTests)) {
        event.preventDefault();
        onRunSampleTests();
        return;
      }

      if (matchesShortcut(event, shortcuts.insertSnippet)) {
        event.preventDefault();
        insertQuickSnippet();
        return;
      }

      if (matchesShortcut(event, shortcuts.formatCode)) {
        event.preventDefault();
        void formatCode();
        return;
      }

      if (matchesShortcut(event, shortcuts.timerStart)) {
        event.preventDefault();
        onTimerStart();
        return;
      }

      if (matchesShortcut(event, shortcuts.timerPause)) {
        event.preventDefault();
        onTimerPause();
        return;
      }

      if (matchesShortcut(event, shortcuts.timerReset)) {
        event.preventDefault();
        onTimerReset();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [formatCode, insertQuickSnippet, onRunSampleTests, onTimerPause, onTimerReset, onTimerStart, shortcuts]);

  useEffect(() => {
    let cancelled = false;

    /**
     * Vimモード設定に合わせてエディタへVimキーマップを適用する。
     *
     * @returns {Promise<void>} 値は返さない。
     */
    async function applyVimMode(): Promise<void> {
      disposeVimModeController();
      setVimModeErrorMessage(null);

      if (!vimModeEnabled || !isEditorReady || !editorRef.current || !vimStatusRef.current) {
        return;
      }

      try {
        const moduleName = MONACO_VIM_MODULE_NAME;
        const monacoVimModule = (await import(/* @vite-ignore */ moduleName)) as MonacoVimModule;
        if (cancelled) {
          return;
        }

        if (typeof monacoVimModule.initVimMode !== 'function') {
          setVimModeErrorMessage('monaco-vim の初期化に失敗しました。');
          return;
        }

        vimModeControllerRef.current = monacoVimModule.initVimMode(editorRef.current, vimStatusRef.current);
      } catch {
        if (!cancelled) {
          setVimModeErrorMessage('monaco-vim が未導入のため Vim モードを有効化できません。');
        }
      }
    }

    void applyVimMode();

    return () => {
      cancelled = true;
      disposeVimModeController();
    };
  }, [disposeVimModeController, isEditorReady, vimModeEnabled]);

  /**
   * Monaco Editor のインスタンスを保持する。
   *
   * @param {MonacoEditorNamespace.IStandaloneCodeEditor} editor エディタインスタンス。
   * @returns {void} 値は返さない。
   */
  function handleEditorMount(editor: MonacoEditorNamespace.IStandaloneCodeEditor): void {
    editorRef.current = editor;
    setIsEditorReady(true);
  }

  /**
   * Monaco Editor の変更内容をローカル状態へ反映する。
   *
   * @param {string | undefined} next 最新のエディタ内容。
   * @returns {void} 値は返さない。
   */
  function handleEditorChange(next: string | undefined): void {
    setCode(next ?? '');
  }

  return (
    <div className="editor-root">
      <div className="editor-toolbar">
        <div className="editor-file">
          <span className="file-dot" />
          <span>{problemId ? `${problemId}.cpp` : 'solution.cpp'}</span>
        </div>
        <div className="editor-toolbar-actions">
          <button type="button" className="ghost-button" onClick={insertQuickSnippet}>
            スニペット挿入 ({shortcuts.insertSnippet})
          </button>
          <button type="button" className="ghost-button" onClick={() => void formatCode()} disabled={isFormatting}>
            {isFormatting ? '整形中...' : `整形 (${shortcuts.formatCode})`}
          </button>
          <button type="button" className="primary-button" onClick={onRunSampleTests} disabled={isRunningTests}>
            {isRunningTests ? '実行中...' : `実行 (${shortcuts.runSampleTests})`}
          </button>
        </div>
      </div>
      {vimModeEnabled ? (
        <div className="vim-status-strip">
          <span className="vim-status-label">Vim</span>
          {vimModeErrorMessage ? (
            <span className="vim-status-error">{vimModeErrorMessage}</span>
          ) : (
            <div ref={vimStatusRef} className="vim-status-value" />
          )}
        </div>
      ) : null}
      <div className="editor-content">
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          value={code}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={options}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
