import { useEffect, useRef } from 'react';
import { useSubmissionStore } from '../../stores/submissionStore';

/**
 * 提出結果文字列を表示用クラスへ変換する。
 *
 * @param {string} result 判定文字列。
 * @returns {string} CSSクラス名。
 */
function toVerdictClassName(result: string): string {
  const normalized = result.toUpperCase();

  if (normalized.startsWith('AC')) {
    return 'ac';
  }

  if (normalized.startsWith('WA')) {
    return 'wa';
  }

  if (normalized.startsWith('TLE')) {
    return 'tle';
  }

  if (normalized.startsWith('RE')) {
    return 're';
  }

  if (normalized.startsWith('CE')) {
    return 'ce';
  }

  return '';
}

/**
 * UNIX秒を画面表示用文字列へ変換する。
 *
 * @param {number} epochSecond UNIX秒。
 * @returns {string} 日時文字列。
 */
function formatSubmissionDate(epochSecond: number): string {
  return new Date(epochSecond * 1000).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * メモリ使用量を表示向けに整形する。
 *
 * @param {number | null} memoryKb メモリ使用量(KB)。
 * @returns {string} 表示文字列。
 */
function formatMemory(memoryKb: number | null): string {
  if (memoryKb == null) {
    return '-';
  }

  if (memoryKb >= 1024) {
    return `${(memoryKb / 1024).toFixed(1)}MB`;
  }

  return `${memoryKb}KB`;
}

/**
 * 提出履歴ビューを表示する。
 *
 * @returns {JSX.Element} 提出履歴パネル。
 */
function SubmissionHistory() {
  const username = useSubmissionStore((state) => state.username);
  const lookbackDays = useSubmissionStore((state) => state.lookbackDays);
  const isLoading = useSubmissionStore((state) => state.isLoading);
  const errorMessage = useSubmissionStore((state) => state.errorMessage);
  const submissions = useSubmissionStore((state) => state.submissions);
  const lastFetchedAt = useSubmissionStore((state) => state.lastFetchedAt);
  const setUsername = useSubmissionStore((state) => state.setUsername);
  const setLookbackDays = useSubmissionStore((state) => state.setLookbackDays);
  const fetchSubmissions = useSubmissionStore((state) => state.fetchSubmissions);
  const hasFetchedOnMount = useRef(false);

  useEffect(() => {
    if (hasFetchedOnMount.current) {
      return;
    }

    hasFetchedOnMount.current = true;
    if (username) {
      void fetchSubmissions();
    }
  }, [username, fetchSubmissions]);

  return (
    <div className="submission-panel">
      <div className="submission-toolbar">
        <label className="field-inline" htmlFor="submission-user">
          User
          <input
            id="submission-user"
            className="compact-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="atcoder user"
          />
        </label>
        <label className="field-inline" htmlFor="submission-days">
          期間(日)
          <input
            id="submission-days"
            className="compact-input days-input"
            value={lookbackDays}
            onChange={(event) => setLookbackDays(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <button type="button" className="primary-button" onClick={() => void fetchSubmissions()} disabled={isLoading}>
          {isLoading ? '取得中...' : '更新'}
        </button>
        <small className="submission-meta">
          {lastFetchedAt ? `最終更新: ${new Date(lastFetchedAt).toLocaleTimeString('ja-JP')}` : '未取得'}
        </small>
      </div>

      {errorMessage ? (
        <div className="error-box">
          <p>提出履歴を取得できませんでした。</p>
          <small>{errorMessage}</small>
        </div>
      ) : null}

      {!errorMessage && submissions.length === 0 ? <p className="empty-note">提出履歴がありません。</p> : null}

      {submissions.length > 0 ? (
        <div className="submission-table-wrap">
          <table className="submission-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>問題</th>
                <th>言語</th>
                <th>結果</th>
                <th>実行時間</th>
                <th>メモリ</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{formatSubmissionDate(submission.epochSecond)}</td>
                  <td>{submission.problemId}</td>
                  <td>{submission.language}</td>
                  <td>
                    <span className={`verdict ${toVerdictClassName(submission.result)}`}>{submission.result}</span>
                  </td>
                  <td>{submission.executionTimeMs != null ? `${submission.executionTimeMs}ms` : '-'}</td>
                  <td>{formatMemory(submission.memoryKb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default SubmissionHistory;
