import { useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';

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
};

/**
 * Monaco Editor を表示し、C++コードの編集状態を管理する。
 *
 * @param {CodeEditorProps} props エディタに適用する表示テーマと問題情報。
 * @returns {JSX.Element} コードエディタパネル要素を返す。
 */
function CodeEditor({ theme, problemId, problemTitle, onRunSampleTests, isRunningTests }: CodeEditorProps) {
  const code = useEditorStore((state) => state.code);
  const setCode = useEditorStore((state) => state.setCode);
  const resetCodeForProblem = useEditorStore((state) => state.resetCodeForProblem);

  const options = useMemo(
    () => ({
      minimap: { enabled: true },
      fontSize: 14,
      fontLigatures: true,
      lineNumbers: 'on' as const,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      wordWrap: 'off' as const,
    }),
    []
  );

  useEffect(() => {
    resetCodeForProblem(problemId, problemTitle);
  }, [problemId, problemTitle, resetCodeForProblem]);

  useEffect(() => {
    /**
     * Ctrl+Enterでサンプル実行を開始する。
     *
     * @param {KeyboardEvent} event キーボードイベント。
     * @returns {void} 値は返さない。
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (!event.ctrlKey || event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      onRunSampleTests();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onRunSampleTests]);

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
        <button type="button" className="primary-button" onClick={onRunSampleTests} disabled={isRunningTests}>
          {isRunningTests ? '実行中...' : '実行 (Ctrl+Enter)'}
        </button>
      </div>
      <Editor
        height="100%"
        defaultLanguage="cpp"
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        value={code}
        onChange={handleEditorChange}
        options={options}
      />
    </div>
  );
}

export default CodeEditor;
