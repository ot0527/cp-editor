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
