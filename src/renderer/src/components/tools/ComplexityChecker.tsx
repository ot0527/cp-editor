import { useComplexityStore } from '../../stores/complexityStore';

/**
 * 実行したコードの推定計算量を表示する。
 *
 * @returns {JSX.Element} 計算量チェッカーパネル。
 */
function ComplexityChecker() {
  const lastResult = useComplexityStore((state) => state.lastResult);

  return (
    <div className="complexity-panel">
      {lastResult ? (
        <div className="complexity-result">
          <p>
            推定計算量: <strong>{lastResult.expression}</strong>
          </p>
          <p>
            ループ検出: <strong>{lastResult.loopCount}</strong> (線形深度 {lastResult.maxLinearDepth}, 対数深度{' '}
            {lastResult.maxLogDepth})
          </p>
          <p>
            sort呼び出し: <strong>{lastResult.sortCallCount}</strong>
          </p>
          <p>{lastResult.note}</p>
        </div>
      ) : (
        <p className="empty-note">コードを実行すると、ここに推定計算量を表示します。</p>
      )}
    </div>
  );
}

export default ComplexityChecker;
