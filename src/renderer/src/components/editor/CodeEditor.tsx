import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import defaultTemplate from '../../../../data/defaultTemplate.cpp?raw';

type CodeEditorProps = {
  /** Monacoに適用するテーマ。 */
  theme: 'light' | 'dark';
};

/**
 * Monaco Editor を表示し、C++コードの編集状態を管理する。
 *
 * @param {CodeEditorProps} props エディタに適用する表示テーマ。
 * @returns {JSX.Element} コードエディタパネル要素を返す。
 */
function CodeEditor({ theme }: CodeEditorProps) {
  const [code, setCode] = useState(defaultTemplate);

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
          <span>solution.cpp</span>
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
