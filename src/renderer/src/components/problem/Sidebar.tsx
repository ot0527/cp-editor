import { useMemo } from 'react';
import { CATEGORY_ORDER, DIFFICULTY_BAND_ORDER } from '../../../../shared/problemMeta';
import type { DifficultyBand, ProblemCategory, ProblemIndexItem } from '../../../../shared/types/problem';

type SidebarProps = {
  problems: ProblemIndexItem[];
  searchQuery: string;
  isLoading: boolean;
  selectedProblemId: string | null;
  onSearchQueryChange: (query: string) => void;
  onSelectProblem: (problemId: string) => void;
};

interface GroupedCategory {
  category: ProblemCategory;
  total: number;
  byBand: Record<DifficultyBand, ProblemIndexItem[]>;
}

/**
 * 難易度帯ごとの初期配列を生成する。
 *
 * @returns {Record<DifficultyBand, ProblemIndexItem[]>} 初期マップ。
 */
function createEmptyBandMap(): Record<DifficultyBand, ProblemIndexItem[]> {
  return {
    灰: [],
    茶: [],
    緑: [],
    水: [],
    青: [],
    黄: [],
    橙: [],
    赤: [],
    不明: [],
  };
}

/**
 * 問題一覧をカテゴリ・難易度帯ごとにグルーピングする。
 *
 * @param {ProblemIndexItem[]} problems 全問題。
 * @param {string} searchQuery 検索クエリ。
 * @returns {GroupedCategory[]} グルーピング結果。
 */
function groupProblems(problems: ProblemIndexItem[], searchQuery: string): GroupedCategory[] {
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? problems.filter((problem) => `${problem.id} ${problem.title}`.toLowerCase().includes(query))
    : problems;

  const groupedMap = new Map<ProblemCategory, GroupedCategory>();

  for (const category of CATEGORY_ORDER) {
    groupedMap.set(category, {
      category,
      total: 0,
      byBand: createEmptyBandMap(),
    });
  }

  for (const problem of filtered) {
    const grouped = groupedMap.get(problem.category);
    if (!grouped) {
      continue;
    }

    grouped.byBand[problem.difficultyBand].push(problem);
    grouped.total += 1;
  }

  return CATEGORY_ORDER.map((category) => groupedMap.get(category) as GroupedCategory).filter((group) => group.total > 0);
}

/**
 * 問題カテゴリツリーを表示するサイドバー。
 *
 * @param {SidebarProps} props 表示データとイベントハンドラ。
 * @returns {JSX.Element} サイドバー要素。
 */
function Sidebar({
  problems,
  searchQuery,
  isLoading,
  selectedProblemId,
  onSearchQueryChange,
  onSelectProblem,
}: SidebarProps) {
  const groupedProblems = useMemo(() => groupProblems(problems, searchQuery), [problems, searchQuery]);

  return (
    <div className="sidebar-body">
      <h2 className="panel-title">問題一覧</h2>
      <input
        className="search-input"
        placeholder="問題ID・問題名で検索"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
      />

      {isLoading ? <p className="empty-note">問題一覧を取得中...</p> : null}

      {!isLoading && groupedProblems.length === 0 ? (
        <p className="empty-note">条件に一致する問題がありません。</p>
      ) : null}

      <div className="problem-tree">
        {groupedProblems.map((categoryGroup) => (
          <details key={categoryGroup.category} className="tree-category">
            <summary className="tree-summary">{categoryGroup.category}</summary>
            <div className="band-tree">
              {DIFFICULTY_BAND_ORDER.map((band) => {
                const bandProblems = categoryGroup.byBand[band];
                if (bandProblems.length === 0) {
                  return null;
                }

                return (
                  <details key={`${categoryGroup.category}-${band}`} className="tree-band">
                    <summary className="tree-summary small">
                      {band} ({bandProblems.length})
                    </summary>
                    <ul className="problem-list">
                      {bandProblems.map((problem) => (
                        <li key={problem.id}>
                          <button
                            type="button"
                            className={`problem-item${selectedProblemId === problem.id ? ' selected' : ''}`}
                            onClick={() => onSelectProblem(problem.id)}
                          >
                            <span className="problem-main">
                              <span className="problem-id">{problem.id}</span>
                              <span className="problem-title">{problem.title}</span>
                            </span>
                            <span
                              className="difficulty-badge"
                              style={{ backgroundColor: problem.difficultyColor }}
                              title={`difficulty: ${problem.difficulty ?? 'unknown'}`}
                            >
                              {problem.difficulty ?? '-'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      <div className="storage-card">
        <p>表示中 {problems.length} 問</p>
        <small>Phase3: 実行・テスト機能まで実装済み</small>
      </div>
    </div>
  );
}

export default Sidebar;
