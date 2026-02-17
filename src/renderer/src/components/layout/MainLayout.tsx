import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../problem/Sidebar';
import ProblemView from '../problem/ProblemView';
import CodeEditor from '../editor/CodeEditor';
import BottomPanel from '../test/BottomPanel';
import StatusBar from './StatusBar';
import TitleBar from './TitleBar';
import SettingsModal from '../settings/SettingsModal';
import { useProblemStore } from '../../stores/problemStore';
import { useEditorStore } from '../../stores/editorStore';
import { useTestStore } from '../../stores/testStore';
import { useTimerStore } from '../../stores/timerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getAppThemeMode, getEditorThemeOption } from '../../themes/editorThemes';

/**
 * 画面全体のレイアウトを構成し、テーマ状態を管理する。
 *
 * @returns {JSX.Element} アプリケーションのメインレイアウトを返す。
 */
function MainLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  const editorThemeId = useSettingsStore((state) => state.editorThemeId);
  const selectedEditorTheme = useMemo(() => getEditorThemeOption(editorThemeId), [editorThemeId]);

  useEffect(() => {
    document.documentElement.dataset.theme = getAppThemeMode(editorThemeId);
  }, [editorThemeId]);

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

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedProblemId) ?? null,
    [problems, selectedProblemId]
  );

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
   * 設定モーダルを開く。
   *
   * @returns {void} 値は返さない。
   */
  function handleOpenSettings(): void {
    setIsSettingsOpen(true);
  }

  /**
   * 設定モーダルを閉じる。
   *
   * @returns {void} 値は返さない。
   */
  function handleCloseSettings(): void {
    setIsSettingsOpen(false);
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
      <TitleBar onOpenSettings={handleOpenSettings} />
      <div className="content-row">
        <aside className="sidebar">
          <Sidebar
            problems={problems}
            searchQuery={searchQuery}
            isLoading={isLoadingProblems}
            errorMessage={errorMessage}
            selectedProblemId={selectedProblemId}
            onSearchQueryChange={setSearchQuery}
            onSelectProblem={handleSelectProblem}
            onRetryLoadProblems={() => void loadProblems()}
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
                editorThemeId={editorThemeId}
                problemId={selectedProblem?.id}
                problemTitle={selectedProblem?.title}
                onRunSampleTests={handleRunSampleTests}
                isRunningTests={isRunningTests}
                onTimerStart={startTimer}
                onTimerPause={pauseTimer}
                onTimerReset={resetTimer}
              />
            </section>
          </div>
          <BottomPanel sourceCode={editorCode} />
        </main>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      <StatusBar
        themeLabel={selectedEditorTheme.label}
        selectedProblemId={selectedProblem?.id ?? null}
        problemCount={problems.length}
      />
    </div>
  );
}

export default MainLayout;
