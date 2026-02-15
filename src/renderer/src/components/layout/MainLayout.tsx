import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../problem/Sidebar';
import ProblemView from '../problem/ProblemView';
import CodeEditor from '../editor/CodeEditor';
import BottomPanel from '../test/BottomPanel';
import StatusBar from './StatusBar';
import TitleBar from './TitleBar';
import { useProblemStore } from '../../stores/problemStore';
import { useEditorStore } from '../../stores/editorStore';
import { useTestStore } from '../../stores/testStore';
import { useTimerStore } from '../../stores/timerStore';

/**
 * 画面全体のレイアウトを構成し、テーマ状態を管理する。
 *
 * @returns {JSX.Element} アプリケーションのメインレイアウトを返す。
 */
function MainLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const problems = useProblemStore((state) => state.problems);
  const selectedProblemId = useProblemStore((state) => state.selectedProblemId);
  const selectedProblemDetail = useProblemStore((state) => state.selectedProblemDetail);
  const searchQuery = useProblemStore((state) => state.searchQuery);
  const isLoadingProblems = useProblemStore((state) => state.isLoadingProblems);
  const isLoadingProblemDetail = useProblemStore((state) => state.isLoadingProblemDetail);
  const errorMessage = useProblemStore((state) => state.errorMessage);
  const setSearchQuery = useProblemStore((state) => state.setSearchQuery);
  const loadProblems = useProblemStore((state) => state.loadProblems);
  const selectProblem = useProblemStore((state) => state.selectProblem);
  const refreshSelectedProblem = useProblemStore((state) => state.refreshSelectedProblem);
  const editorCode = useEditorStore((state) => state.code);
  const runSampleTests = useTestStore((state) => state.runSampleTests);
  const isRunningTests = useTestStore((state) => state.isRunningTests);
  const testResults = useTestStore((state) => state.testResults);
  const setSelectedProblemForTimer = useTimerStore((state) => state.setSelectedProblem);
  const isTimerRunning = useTimerStore((state) => state.isRunning);
  const refreshTimerTick = useTimerStore((state) => state.refreshTick);
  const startTimer = useTimerStore((state) => state.start);
  const pauseTimer = useTimerStore((state) => state.pause);
  const resetTimer = useTimerStore((state) => state.reset);
  const stopOnAcceptedIfEnabled = useTimerStore((state) => state.stopOnAcceptedIfEnabled);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  useEffect(() => {
    setSelectedProblemForTimer(selectedProblemId);
  }, [selectedProblemId, setSelectedProblemForTimer]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    refreshTimerTick();
    const intervalId = window.setInterval(() => {
      refreshTimerTick();
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTimerRunning, refreshTimerTick]);

  useEffect(() => {
    if (testResults.length === 0) {
      return;
    }

    const allAccepted = testResults.every((result) => result.verdict === 'AC');
    if (allAccepted) {
      stopOnAcceptedIfEnabled();
    }
  }, [testResults, stopOnAcceptedIfEnabled]);

  useEffect(() => {
    /**
     * タイマーショートカットを処理する。
     *
     * @param {KeyboardEvent} event キーボードイベント。
     * @returns {void} 値は返さない。
     */
    function handleTimerShortcut(event: KeyboardEvent): void {
      if (!event.ctrlKey || !event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        startTimer();
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        pauseTimer();
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        resetTimer();
      }
    }

    window.addEventListener('keydown', handleTimerShortcut);
    return () => {
      window.removeEventListener('keydown', handleTimerShortcut);
    };
  }, [startTimer, pauseTimer, resetTimer]);

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedProblemId) ?? null,
    [problems, selectedProblemId]
  );

  /**
   * 現在のテーマをライト/ダークで切り替える。
   *
   * @returns {void} 値は返さない。
   */
  function handleToggleTheme(): void {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  /**
   * サイドバーで選択された問題IDを状態へ反映する。
   *
   * @param {string} problemId 選択された問題ID。
   * @returns {void} 値は返さない。
   */
  function handleSelectProblem(problemId: string): void {
    void selectProblem(problemId);
  }

  /**
   * 問題のAtCoderページを外部ブラウザで開く。
   *
   * @param {string} url 開くURL。
   * @returns {void} 値は返さない。
   */
  function handleOpenExternal(url: string): void {
    void window.cpeditor.app.openExternal(url);
  }

  /**
   * 選択中問題のサンプルケースで実行する。
   *
   * @returns {void} 値は返さない。
   */
  function handleRunSampleTests(): void {
    void runSampleTests(editorCode, selectedProblemDetail?.samples ?? []);
  }

  return (
    <div className="app-shell">
      <TitleBar theme={theme} onToggleTheme={handleToggleTheme} />
      <div className="content-row">
        <aside className="sidebar">
          <Sidebar
            problems={problems}
            searchQuery={searchQuery}
            isLoading={isLoadingProblems}
            selectedProblemId={selectedProblemId}
            onSearchQueryChange={setSearchQuery}
            onSelectProblem={handleSelectProblem}
          />
        </aside>
        <main className="main-area">
          <div className="top-split">
            <section className="panel problem-panel">
              <ProblemView
                problem={selectedProblem}
                detail={selectedProblemDetail}
                isLoading={isLoadingProblemDetail}
                errorMessage={errorMessage}
                onOpenExternal={handleOpenExternal}
                onRetry={refreshSelectedProblem}
              />
            </section>
            <section className="panel editor-panel">
              <CodeEditor
                theme={theme}
                problemId={selectedProblem?.id}
                problemTitle={selectedProblem?.title}
                onRunSampleTests={handleRunSampleTests}
                isRunningTests={isRunningTests}
              />
            </section>
          </div>
          <BottomPanel sourceCode={editorCode} samples={selectedProblemDetail?.samples ?? []} />
        </main>
      </div>
      <StatusBar theme={theme} selectedProblemId={selectedProblem?.id ?? null} problemCount={problems.length} />
    </div>
  );
}

export default MainLayout;
