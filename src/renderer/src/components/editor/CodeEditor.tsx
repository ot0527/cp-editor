import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import defaultTemplate from '../../../../data/defaultTemplate.cpp?raw';

type CodeEditorProps = {
  /** Monacoに適用するテーマ。 */
  theme: 'light' | 'dark';
  /** 現在選択中の問題ID。 */
  problemId?: string;
  /** 現在選択中の問題タイトル。 */
  problemTitle?: string;
};

/**
 * 問題選択時に挿入するC++テンプレート文字列を生成する。
 *
 * @param {string | undefined} problemId 問題ID。
 * @param {string | undefined} problemTitle 問題タイトル。
 * @returns {string} 挿入するテンプレート。
 */
function createTemplate(problemId: string | undefined, problemTitle: string | undefined): string {
  if (!problemId) {
    return defaultTemplate;
  }

  const header = `// Problem: ${problemId}${problemTitle ? ` - ${problemTitle}` : ''}\n\n`;
  return `${header}${defaultTemplate}`;
}

/**
 * Monaco Editor を表示し、C++コードの編集状態を管理する。
 *
 * @param {CodeEditorProps} props エディタに適用する表示テーマと問題情報。
 * @returns {JSX.Element} コードエディタパネル要素を返す。
 */
function CodeEditor({ theme, problemId, problemTitle }: CodeEditorProps) {
  const [code, setCode] = useState(() => createTemplate(problemId, problemTitle));

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
    setCode(createTemplate(problemId, problemTitle));
  }, [problemId, problemTitle]);

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
        <button type="button" className="primary-button">
          実行 (Ctrl+Enter)
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
