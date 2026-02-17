import { formatElapsedDuration, useTimerStore } from '../../stores/timerStore';

type TitleBarProps = {
  /** 設定ボタン押下時の処理。 */
  onOpenSettings: () => void;
};

/**
 * ワークスペースの状態とタイマー操作を集約した上部ヘッダーを描画する。
 *
 * @param {TitleBarProps} props 設定モーダル起動ハンドラ。
 * @returns {JSX.Element} タイトルバー要素を返す。
 */
function TitleBar({ onOpenSettings }: TitleBarProps) {
  const isRunning = useTimerStore((state) => state.isRunning);
  const elapsedMs = useTimerStore((state) => state.elapsedMs);
  const startedAtMs = useTimerStore((state) => state.startedAtMs);
  const tickMs = useTimerStore((state) => state.tickMs);
  const autoStartOnProblemSelect = useTimerStore((state) => state.autoStartOnProblemSelect);
  const autoStopOnAC = useTimerStore((state) => state.autoStopOnAC);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const reset = useTimerStore((state) => state.reset);
  const setAutoStartOnProblemSelect = useTimerStore((state) => state.setAutoStartOnProblemSelect);
  const setAutoStopOnAC = useTimerStore((state) => state.setAutoStopOnAC);

  const currentElapsedMs = isRunning && startedAtMs != null ? elapsedMs + (tickMs - startedAtMs) : elapsedMs;
  const timerStateLabel = isRunning ? 'RUNNING' : 'PAUSED';

  return (
    <header className="title-bar">
      <div className="title-left">
        <div className="brand-mark">CP</div>
        <div className="brand-text">
          <strong>cp-editor</strong>
          <small>AtCoder Workspace</small>
        </div>
        <span className={`session-pill${isRunning ? ' running' : ''}`}>{timerStateLabel}</span>
      </div>
      <div className="title-right">
        <div className="timer-cluster">
          <div className="timer-block">
            <span className="timer-caption">Session</span>
            <span className="timer-readout">{formatElapsedDuration(currentElapsedMs)}</span>
          </div>
          <button type="button" className="ghost-button" onClick={isRunning ? pause : start}>
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button type="button" className="ghost-button" onClick={reset}>
            Reset
          </button>
          <label className="timer-option">
            <input
              type="checkbox"
              checked={autoStartOnProblemSelect}
              onChange={(event) => setAutoStartOnProblemSelect(event.target.checked)}
            />
            AutoStart
          </label>
          <label className="timer-option">
            <input type="checkbox" checked={autoStopOnAC} onChange={(event) => setAutoStopOnAC(event.target.checked)} />
            AutoStop AC
          </label>
        </div>
        <button type="button" className="ghost-button settings-open-button icon-button" onClick={onOpenSettings}>
          設定
        </button>
        <div className="profile-chip">TG</div>
      </div>
    </header>
  );
}

export default TitleBar;
