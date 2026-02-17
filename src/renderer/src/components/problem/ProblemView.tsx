import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { normalizeAtCoderMathInHtml } from '../../../../shared/mathNotation';
import type { ProblemDetail, ProblemIndexItem } from '../../../../shared/types/problem';

type ProblemViewProps = {
  problem: ProblemIndexItem | null;
  detail: ProblemDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  onOpenExternal: (url: string) => void;
  onRetry: () => Promise<void>;
};

/**
 * 問題文HTMLをDOMPurifyでサニタイズする。
 *
 * @param {string} html サニタイズ対象HTML。
 * @returns {string} 安全化されたHTML。
 */
function sanitizeProblemHtml(html: string): string {
  const normalizedHtml = normalizeAtCoderMathInHtml(html);
  return DOMPurify.sanitize(normalizedHtml, {
    USE_PROFILES: { html: true },
  });
}

/**
 * 選択中問題の本文・サンプルを表示する。
 *
 * @param {ProblemViewProps} props 表示対象データとイベントハンドラ。
 * @returns {JSX.Element} 問題表示パネル要素。
 */
function ProblemView({ problem, detail, isLoading, errorMessage, onOpenExternal, onRetry }: ProblemViewProps) {
  const sanitizedSections = useMemo(
    () => detail?.sections.map((section) => ({ ...section, html: sanitizeProblemHtml(section.html) })) ?? [],
    [detail]
  );

  if (!problem) {
    return (
      <article className="problem-body">
        <p className="empty-note">問題を選択すると、ここに問題文が表示されます。</p>
      </article>
    );
  }

  return (
    <article className="problem-body">
      <div className="problem-header">
        <div className="problem-headline">
          <p className="section-label">問題プレビュー</p>
          <h2 className="panel-title">
            {problem.id} - {problem.title}
          </h2>
          <p className="problem-subline">実装前に制約・計算量・入出力形式を確認</p>
        </div>
        <div className="tag-row">
          <span className="tag">カテゴリ: {problem.category}</span>
          <span className="tag">難易度: {problem.difficulty ?? '不明'}</span>
        </div>
      </div>

      <div className="problem-actions">
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            if (detail?.url) {
              onOpenExternal(detail.url);
            }
          }}
          disabled={!detail?.url}
        >
          AtCoderで開く
        </button>
        <button className="ghost-button" type="button" onClick={() => void onRetry()}>
          再読み込み
        </button>
      </div>

      {isLoading ? <p className="empty-note">問題文を取得中...</p> : null}

      {!isLoading && errorMessage ? (
        <div className="error-box">
          <p>問題文の取得に失敗しました。</p>
          <small>{errorMessage}</small>
        </div>
      ) : null}

      {!isLoading && !errorMessage && detail ? (
        <>
          {sanitizedSections.map((section, index) => (
            <section key={`${detail.problemId}-${section.heading}-${index}`} className="problem-section">
              <h4 className="sub-title">{section.heading}</h4>
              <div className="problem-html" dangerouslySetInnerHTML={{ __html: section.html }} />
            </section>
          ))}

          {detail.samples.length > 0 ? (
            <section className="problem-section">
              <h4 className="sub-title">サンプルケース</h4>
              <div className="sample-grid">
                {detail.samples.map((sample) => (
                  <div key={`${detail.problemId}-sample-${sample.index}`} className="sample-card">
                    <p className="sample-title">入力例 {sample.index}</p>
                    <pre className="code-block">{sample.input || '(empty)'}</pre>
                    <p className="sample-title">出力例 {sample.index}</p>
                    <pre className="code-block">{sample.output || '(empty)'}</pre>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

export default ProblemView;
