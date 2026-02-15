import { useComplexityStore } from '../../stores/complexityStore';
import { formatElapsedDuration, useTimerStore } from '../../stores/timerStore';

type StatusBarProps = {
  /** 現在選択されているテーマ。 */
  theme: 'light' | 'dark';
  /** 選択中の問題ID。 */
  selectedProblemId: string | null;
  /** ロード済み問題数。 */
  problemCount: number;
};

/**
 * エディタ下部に現在の実行環境情報を表示する。
 *
 * @param {StatusBarProps} props 表示テーマ情報。
 * @returns {JSX.Element} ステータスバー要素を返す。
 */
function StatusBar({ theme, selectedProblemId, problemCount }: StatusBarProps) {
  const version = window.cpeditor?.version ?? 'dev';
  const complexitySummary = useComplexityStore((state) => state.statusSummary);
  const isRunning = useTimerStore((state) => state.isRunning);
  const elapsedMs = useTimerStore((state) => state.elapsedMs);
  const startedAtMs = useTimerStore((state) => state.startedAtMs);
  const tickMs = useTimerStore((state) => state.tickMs);
  const timerText = formatElapsedDuration(isRunning && startedAtMs != null ? elapsedMs + (tickMs - startedAtMs) : elapsedMs);

  return (
    <footer className="status-bar">
      <span>言語: C++17</span>
      <span>文字コード: UTF-8</span>
      <span>問題数: {problemCount}</span>
      <span>選択中: {selectedProblemId ?? '-'}</span>
      <span>計算量: {complexitySummary}</span>
      <span>
        Timer: {timerText} {isRunning ? '(RUN)' : '(PAUSE)'}
      </span>
      <span>テーマ: {theme === 'light' ? 'ホワイト' : 'ダーク'}</span>
      <span>cpeditor v{version}</span>
    </footer>
  );
}

export default StatusBar;
