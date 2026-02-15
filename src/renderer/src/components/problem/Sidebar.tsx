const quickMenus = [
  'ホーム',
  '最近使った問題',
  'お気に入り',
  '提出履歴',
  '学習統計',
];

const categories = [
  '全探索',
  '二分探索',
  '貪欲法',
  '動的計画法',
  'グラフ',
  'データ構造',
  '数学',
  '文字列',
];

function Sidebar() {
  return (
    <div className="sidebar-body">
      <h2 className="panel-title">ワークスペース</h2>
      <input className="search-input" placeholder="問題ID・問題名で検索" />
      <div className="sidebar-section">
        <p className="section-label">クイックアクセス</p>
        <ul className="category-list">
          {quickMenus.map((menu) => (
            <li key={menu} className="category-item">
              {menu}
            </li>
          ))}
        </ul>
      </div>
      <div className="sidebar-section">
        <p className="section-label">カテゴリ</p>
        <ul className="category-list">
          {categories.map((category) => (
            <li key={category} className="category-item">
              {category}
            </li>
          ))}
        </ul>
      </div>
      <div className="storage-card">
        <p>進捗 64%</p>
        <small>今週の目標: 10問中 6問達成</small>
      </div>
    </div>
  );
}

export default Sidebar;
