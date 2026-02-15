type TitleBarProps = {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
};

function TitleBar({ theme, onToggleTheme }: TitleBarProps) {
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
