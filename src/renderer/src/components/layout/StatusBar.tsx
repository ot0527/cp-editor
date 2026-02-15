type StatusBarProps = {
  /** 現在選択されているテーマ。 */
  theme: 'light' | 'dark';
};

/**
 * エディタ下部に現在の実行環境情報を表示する。
 *
 * @param {StatusBarProps} props 表示テーマ情報。
 * @returns {JSX.Element} ステータスバー要素を返す。
 */
function StatusBar({ theme }: StatusBarProps) {
  const version = window.cpeditor?.version ?? 'dev';

  return (
    <footer className="status-bar">
      <span>言語: C++17</span>
      <span>文字コード: UTF-8</span>
      <span>計算量: O(N log N) 未チェック</span>
      <span>テーマ: {theme === 'light' ? 'ホワイト' : 'ダーク'}</span>
      <span>cpeditor v{version}</span>
    </footer>
  );
}

export default StatusBar;
