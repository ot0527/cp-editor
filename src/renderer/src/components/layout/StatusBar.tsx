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

  return (
    <footer className="status-bar">
      <span>言語: C++17</span>
      <span>文字コード: UTF-8</span>
      <span>問題数: {problemCount}</span>
      <span>選択中: {selectedProblemId ?? '-'}</span>
      <span>計算量: O(N log N) 未チェック</span>
      <span>テーマ: {theme === 'light' ? 'ホワイト' : 'ダーク'}</span>
      <span>cpeditor v{version}</span>
    </footer>
  );
}

export default StatusBar;
