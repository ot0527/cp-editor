import { useEffect } from 'react';
import { COMPLEXITY_PRESETS, formatOperationCount, useComplexityStore } from '../../stores/complexityStore';

/**
 * 計算量チェッカーUIを表示する。
 *
 * @returns {JSX.Element} 計算量チェッカーパネル。
 */
function ComplexityChecker() {
  const variables = useComplexityStore((state) => state.variables);
  const selectedPresetId = useComplexityStore((state) => state.selectedPresetId);
  const timeLimitSec = useComplexityStore((state) => state.timeLimitSec);
  const lastResult = useComplexityStore((state) => state.lastResult);
  const setSelectedPresetId = useComplexityStore((state) => state.setSelectedPresetId);
  const setTimeLimitSec = useComplexityStore((state) => state.setTimeLimitSec);
  const setVariableName = useComplexityStore((state) => state.setVariableName);
  const setVariableValue = useComplexityStore((state) => state.setVariableValue);
  const addVariable = useComplexityStore((state) => state.addVariable);
  const removeVariable = useComplexityStore((state) => state.removeVariable);
  const runCheck = useComplexityStore((state) => state.runCheck);

  useEffect(() => {
    if (!lastResult) {
      runCheck();
    }
  }, [lastResult, runCheck]);

  return (
    <div className="complexity-panel">
      <div className="complexity-form">
        <div className="complexity-row">
          <p className="sample-title">変数</p>
          <button type="button" className="ghost-button" onClick={addVariable}>
            + 変数追加
          </button>
        </div>

        <div className="complexity-variable-list">
          {variables.map((variable) => (
            <div key={variable.id} className="complexity-variable-item">
              <input
                className="compact-input variable-name"
                value={variable.name}
                onChange={(event) => setVariableName(variable.id, event.target.value)}
                placeholder="変数名"
              />
              <input
                className="compact-input variable-value"
                value={variable.value}
                onChange={(event) => setVariableValue(variable.id, event.target.value)}
                placeholder="値"
                inputMode="numeric"
              />
              <button
                type="button"
                className="ghost-button"
                onClick={() => removeVariable(variable.id)}
                disabled={variables.length <= 1}
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <div className="complexity-row">
          <label className="field-label" htmlFor="complexity-preset">
            計算量
          </label>
          <select
            id="complexity-preset"
            className="compact-input"
            value={selectedPresetId}
            onChange={(event) => setSelectedPresetId(event.target.value)}
          >
            {COMPLEXITY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="complexity-row">
          <label className="field-label" htmlFor="complexity-limit">
            制限時間(秒)
          </label>
          <input
            id="complexity-limit"
            className="compact-input"
            value={timeLimitSec}
            onChange={(event) => setTimeLimitSec(event.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="complexity-row">
          <span />
          <button type="button" className="primary-button" onClick={runCheck}>
            判定する
          </button>
        </div>
      </div>

      {lastResult ? (
        <div className="complexity-result">
          <p>
            演算回数: <strong>{formatOperationCount(lastResult.estimatedOps)}</strong>
          </p>
          <p>
            上限目安: <strong>{formatOperationCount(lastResult.limitOps)}</strong>
          </p>
          <p className={`complexity-verdict ${lastResult.verdict}`}>
            判定: {lastResult.verdictLabel} ({lastResult.presetLabel})
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default ComplexityChecker;
