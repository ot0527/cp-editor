import { create } from 'zustand';
import defaultTemplate from '../../../data/defaultTemplate.cpp?raw';

interface EditorStoreState {
  code: string;
}

interface EditorStoreActions {
  setCode: (code: string) => void;
  resetCodeForProblem: (problemId?: string, problemTitle?: string) => void;
}

type EditorStore = EditorStoreState & EditorStoreActions;

/**
 * 問題選択時に挿入するC++テンプレート文字列を生成する。
 *
 * @param {string | undefined} problemId 問題ID。
 * @param {string | undefined} problemTitle 問題タイトル。
 * @returns {string} 挿入するテンプレート。
 */
function createEditorTemplate(problemId: string | undefined, problemTitle: string | undefined): string {
  if (!problemId) {
    return defaultTemplate;
  }

  const header = `// Problem: ${problemId}${problemTitle ? ` - ${problemTitle}` : ''}\n\n`;
  return `${header}${defaultTemplate}`;
}

/**
 * Monacoエディタに表示するコード状態を保持するストア。
 */
export const useEditorStore = create<EditorStore>((set) => ({
  code: createEditorTemplate(undefined, undefined),

  /**
   * エディタ内容を更新する。
   *
   * @param {string} code 最新コード。
   * @returns {void} 値は返さない。
   */
  setCode: (code: string): void => {
    set({ code });
  },

  /**
   * 問題情報に合わせてテンプレートを再生成し、エディタへ反映する。
   *
   * @param {string | undefined} problemId 問題ID。
   * @param {string | undefined} problemTitle 問題タイトル。
   * @returns {void} 値は返さない。
   */
  resetCodeForProblem: (problemId?: string, problemTitle?: string): void => {
    set({ code: createEditorTemplate(problemId, problemTitle) });
  },
}));
