import { formatElapsedDuration, useTimerStore } from '../../stores/timerStore';

type TitleBarProps = {
  /** 現在選択されているテーマ。 */
  theme: 'light' | 'dark';
  /** ユーザーがテーマ切替ボタンを押したときの処理。 */
  onToggleTheme: () => void;
};

/**
 * Dropbox風の上部ヘッダーを描画する。
 *
 * @param {TitleBarProps} props 表示テーマとテーマ切替ハンドラ。
 * @returns {JSX.Element} タイトルバー要素を返す。
 */
function TitleBar({ theme, onToggleTheme }: TitleBarProps) {
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

  return (
    <header className="title-bar">
      <div className="title-left">
        <div className="brand-mark">C</div>
        <div className="brand-text">
          <strong>CPEditor</strong>
          <small>Competitive Workspace</small>
        </div>
      </div>
      <div className="title-right">
        <input className="global-search" placeholder="問題・ファイルを検索" />
        <div className="timer-cluster">
          <span className="timer-readout">{formatElapsedDuration(currentElapsedMs)}</span>
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
        <button type="button" className="ghost-button">
          共有
        </button>
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'light' ? 'ダークモード' : 'ホワイトモード'}
        </button>
        <div className="profile-chip">TG</div>
      </div>
    </header>
  );
}

export default TitleBar;
