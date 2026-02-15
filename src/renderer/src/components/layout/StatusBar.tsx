type StatusBarProps = {
  theme: 'light' | 'dark';
};

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
