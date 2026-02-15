/** サンプルテストの判定結果。 */
export type TestVerdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE';

/** カスタム入出力実行の判定結果。 */
export type CustomRunVerdict = 'OK' | 'TLE' | 'RE';

/** サンプルテスト1件分の入力情報。 */
export interface RunSampleTestCase {
  caseIndex: number;
  caseName: string;
  input: string;
  expectedOutput: string;
}

/** コンパイル結果。 */
export interface CompileResult {
  success: boolean;
  errorMessage: string;
  stdout: string;
  stderr: string;
}

/** テスト1件分の実行結果。 */
export interface TestCaseResult {
  caseIndex: number;
  caseName: string;
  verdict: TestVerdict;
  executionTimeMs: number;
  expectedOutput: string;
  actualOutput: string;
  stderr: string;
  exitCode: number | null;
}

/** サンプルテスト実行リクエスト。 */
export interface RunSampleTestsParams {
  sourceCode: string;
  testCases: RunSampleTestCase[];
  timeoutMs?: number;
}

/** サンプルテスト実行レスポンス。 */
export interface RunSampleTestsResult {
  compile: CompileResult;
  results: TestCaseResult[];
}

/** カスタム入出力実行リクエスト。 */
export interface RunCustomInputParams {
  sourceCode: string;
  input: string;
  timeoutMs?: number;
}

/** カスタム入出力の単発実行結果。 */
export interface CustomRunResult {
  verdict: CustomRunVerdict;
  executionTimeMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/** カスタム入出力実行レスポンス。 */
export interface RunCustomInputResult {
  compile: CompileResult;
  result: CustomRunResult | null;
}
