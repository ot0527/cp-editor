import { useMemo } from 'react';
import type { TestCaseResult } from '../../../../shared/types/compiler';
import { useTestStore } from '../../stores/testStore';
import ComplexityChecker from '../tools/ComplexityChecker';

type BottomPanelProps = {
  /** 現在エディタに表示されているC++コード。 */
  sourceCode: string;
};

interface DiffLine {
  type: 'same' | 'add' | 'remove';
  text: string;
}

/**
 * WA表示用に期待出力と実際出力の簡易行単位diffを生成する。
 *
 * @param {string} expected 期待出力。
 * @param {string} actual 実際出力。
 * @returns {DiffLine[]} 表示用diff行配列。
 */
function createLineDiff(expected: string, actual: string): DiffLine[] {
  const expectedLines = expected.replace(/\r\n/g, '\n').split('\n');
  const actualLines = actual.replace(/\r\n/g, '\n').split('\n');
  const maxLength = Math.max(expectedLines.length, actualLines.length);
  const lines: DiffLine[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const expectedLine = expectedLines[index];
    const actualLine = actualLines[index];

    if (expectedLine === actualLine) {
      if (expectedLine != null) {
        lines.push({ type: 'same', text: `  ${expectedLine}` });
      }
      continue;
    }

    if (expectedLine != null) {
      lines.push({ type: 'remove', text: `- ${expectedLine}` });
    }

    if (actualLine != null) {
      lines.push({ type: 'add', text: `+ ${actualLine}` });
    }
  }

  return lines;
}

/**
 * テスト結果のヘッダー行を描画する。
 *
 * @param {TestCaseResult[]} results テスト結果配列。
 * @returns {string} "x/y AC" 形式のサマリ文字列。
 */
function createResultSummary(results: TestCaseResult[]): string {
  const acceptedCount = results.filter((result) => result.verdict === 'AC').length;
  return `${acceptedCount}/${results.length} AC`;
}

/**
 * 下部タブ領域のうち、テスト結果の一覧パネルを表示する。
 *
 * @param {BottomPanelProps} props エディタコード。
 * @returns {JSX.Element} テスト結果パネル要素を返す。
 */
function BottomPanel({ sourceCode }: BottomPanelProps) {
  const activeTab = useTestStore((state) => state.activeTab);
  const isRunningCustomInput = useTestStore((state) => state.isRunningCustomInput);
  const compileErrorMessage = useTestStore((state) => state.compileErrorMessage);
  const testResults = useTestStore((state) => state.testResults);
  const customInput = useTestStore((state) => state.customInput);
  const customResult = useTestStore((state) => state.customResult);
  const setActiveTab = useTestStore((state) => state.setActiveTab);
  const setCustomInput = useTestStore((state) => state.setCustomInput);
  const clearCustomResult = useTestStore((state) => state.clearCustomResult);
  const runCustomInput = useTestStore((state) => state.runCustomInput);
  const resultSummary = useMemo(() => createResultSummary(testResults), [testResults]);

  /**
   * カスタム入出力欄を初期化する。
   *
   * @returns {void} 値は返さない。
   */
  function handleClearCustomInput(): void {
    setCustomInput('');
    clearCustomResult();
  }

  /**
   * カスタム入力で実行する。
   *
   * @returns {void} 値は返さない。
   */
  function handleRunCustomInput(): void {
    void runCustomInput(sourceCode);
  }

  return (
    <section className="bottom-panel">
      <header className="bottom-header">
        <div className="tabs" role="tablist" aria-label="bottom-tabs">
          <button
            className={`tab${activeTab === 'results' ? ' active' : ''}`}
            type="button"
            onClick={() => setActiveTab('results')}
          >
            テスト結果 {testResults.length > 0 ? `(${testResults.length})` : ''}
          </button>
          <button className={`tab${activeTab === 'custom' ? ' active' : ''}`} type="button" onClick={() => setActiveTab('custom')}>
            入出力
          </button>
          <button
            className={`tab${activeTab === 'complexity' ? ' active' : ''}`}
            type="button"
            onClick={() => setActiveTab('complexity')}
          >
            計算量
          </button>
        </div>
      </header>

      {activeTab === 'results' ? (
        <>
          <div className="result-list">
            {compileErrorMessage ? (
              <div className="error-box">
                <p>コンパイルに失敗しました。</p>
                <small>{compileErrorMessage}</small>
              </div>
            ) : null}

            {!compileErrorMessage && testResults.length === 0 ? (
              <p className="empty-note">実行結果はまだありません。エディタ上部の「実行」を押してください。</p>
            ) : null}

            {testResults.map((result) => (
              <div key={`${result.caseName}-${result.caseIndex}`} className="result-item">
                <span className={`verdict ${result.verdict.toLowerCase()}`}>{result.verdict}</span>
                <span>{result.caseName}</span>
                <span>{result.executionTimeMs}ms</span>

                {result.verdict === 'WA' ? (
                  <div className="result-detail">
                    <small>Expected:</small>
                    <pre className="code-block">{result.expectedOutput || '(empty)'}</pre>
                    <small>Actual:</small>
                    <pre className="code-block">{result.actualOutput || '(empty)'}</pre>
                    <small>Diff:</small>
                    <pre className="diff-block">
                      {createLineDiff(result.expectedOutput, result.actualOutput).map((line, index) => (
                        <span key={`${result.caseIndex}-diff-${index}`} className={`diff-line ${line.type}`}>
                          {line.text || ' '}
                        </span>
                      ))}
                    </pre>
                  </div>
                ) : null}

                {result.verdict === 'RE' && result.stderr ? (
                  <div className="result-detail">
                    <small>Runtime Error:</small>
                    <pre className="code-block">{result.stderr}</pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {testResults.length > 0 && !compileErrorMessage ? (
            <div className="result-summary">
              <span>Result: {resultSummary}</span>
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === 'custom' ? (
        <div className="custom-io-panel">
          <div className="custom-io-grid">
            <div className="custom-io-column">
              <p className="sample-title">Input</p>
              <textarea
                className="io-textarea"
                value={customInput}
                onChange={(event) => setCustomInput(event.target.value)}
                placeholder="ここに標準入力を貼り付けます"
              />
            </div>
            <div className="custom-io-column">
              <p className="sample-title">Output</p>
              <textarea
                className="io-textarea"
                value={customResult?.stdout ?? ''}
                readOnly
                placeholder="実行結果がここに表示されます"
              />
            </div>
          </div>

          <div className="custom-io-toolbar">
            <button className="ghost-button" type="button" onClick={handleClearCustomInput}>
              クリア
            </button>
            <button className="primary-button" type="button" onClick={handleRunCustomInput} disabled={isRunningCustomInput}>
              {isRunningCustomInput ? '実行中...' : '実行'}
            </button>
            {customResult ? (
              <>
                <span className={`verdict ${customResult.verdict.toLowerCase()}`}>{customResult.verdict}</span>
                <span>{customResult.executionTimeMs}ms</span>
              </>
            ) : null}
          </div>

          {compileErrorMessage ? (
            <div className="error-box">
              <p>コンパイルに失敗しました。</p>
              <small>{compileErrorMessage}</small>
            </div>
          ) : null}

          {customResult?.stderr ? (
            <div className="result-detail">
              <small>stderr:</small>
              <pre className="code-block">{customResult.stderr}</pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'complexity' ? (
        <ComplexityChecker />
      ) : null}
    </section>
  );
}

export default BottomPanel;
