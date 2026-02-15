/**
 * 選択中問題の本文、入出力例、補助情報を表示する。
 *
 * @returns {JSX.Element} 問題表示パネル要素を返す。
 */
function ProblemView() {
  return (
    <article className="problem-body">
      <div className="problem-header">
        <div>
          <p className="section-label">問題プレビュー</p>
          <h2 className="panel-title">ABC086A - Product</h2>
        </div>
        <div className="tag-row">
          <span className="tag">難易度: 灰</span>
          <span className="tag">想定: 5分</span>
        </div>
      </div>
      <p>
        整数 <code>a</code> と <code>b</code> が与えられます。<code>a * b</code> が偶数か奇数かを判定してください。
      </p>
      <h4 className="sub-title">入力</h4>
      <pre className="code-block">a b</pre>
      <h4 className="sub-title">出力</h4>
      <pre className="code-block">Even または Odd</pre>
      <h4 className="sub-title">入力例 1</h4>
      <pre className="code-block">3 4</pre>
      <h4 className="sub-title">出力例 1</h4>
      <pre className="code-block">Even</pre>
      <button className="ghost-button" type="button">
        AtCoderで開く
      </button>
    </article>
  );
}

export default ProblemView;
