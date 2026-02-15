import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import defaultTemplate from '../../../../data/defaultTemplate.cpp?raw';

type CodeEditorProps = {
  theme: 'light' | 'dark';
};

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
        onChange={(next) => setCode(next ?? '')}
        options={options}
      />
    </div>
  );
}

export default CodeEditor;
