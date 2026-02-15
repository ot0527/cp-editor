/** 提出履歴取得リクエスト。 */
export interface FetchSubmissionsParams {
  username: string;
  fromSecond?: number;
}

/** 提出履歴1件。 */
export interface SubmissionItem {
  id: number;
  epochSecond: number;
  problemId: string;
  contestId: string;
  language: string;
  result: string;
  executionTimeMs: number | null;
  memoryKb: number | null;
  point: number | null;
}
