import { useEffect, useState } from 'react';
import Sidebar from '../problem/Sidebar';
import ProblemView from '../problem/ProblemView';
import CodeEditor from '../editor/CodeEditor';
import BottomPanel from '../test/BottomPanel';
import StatusBar from './StatusBar';
import TitleBar from './TitleBar';

function MainLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="app-shell">
      <TitleBar theme={theme} onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))} />
      <div className="content-row">
        <aside className="sidebar">
          <Sidebar />
        </aside>
        <main className="main-area">
          <div className="top-split">
            <section className="panel problem-panel">
              <ProblemView />
            </section>
            <section className="panel editor-panel">
              <CodeEditor theme={theme} />
            </section>
          </div>
          <BottomPanel />
        </main>
      </div>
      <StatusBar theme={theme} />
    </div>
  );
}

export default MainLayout;
