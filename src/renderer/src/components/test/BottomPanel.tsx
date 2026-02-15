const sampleResults = [
  { caseName: 'ケース 1（サンプル 1）', verdict: 'AC', time: '12ms', detail: '' },
  { caseName: 'ケース 2（サンプル 2）', verdict: 'WA', time: '8ms', detail: '期待値: 5 / 出力: 3' },
  { caseName: 'ケース 3（サンプル 3）', verdict: 'AC', time: '15ms', detail: '' },
];

/**
 * 下部タブ領域のうち、テスト結果の一覧パネルを表示する。
 *
 * @returns {JSX.Element} テスト結果パネル要素を返す。
 */
function BottomPanel() {
  return (
    <section className="bottom-panel">
      <header className="bottom-header">
        <div className="tabs" role="tablist" aria-label="bottom-tabs">
          <button className="tab active" type="button">
            テスト結果
          </button>
          <button className="tab" type="button">
            入出力
          </button>
          <button className="tab" type="button">
            計算量
          </button>
          <button className="tab" type="button">
            提出履歴
          </button>
        </div>
        <button className="primary-button" type="button">
          すべて実行
        </button>
      </header>
      <div className="result-list">
        {sampleResults.map((result) => (
          <div key={result.caseName} className="result-item">
            <span className={`verdict ${result.verdict.toLowerCase()}`}>{result.verdict}</span>
            <span>{result.caseName}</span>
            <span>{result.time}</span>
            {result.detail ? <small>{result.detail}</small> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default BottomPanel;
