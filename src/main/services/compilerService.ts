import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  FormatSourceParams,
  FormatSourceResult,
  CompileResult,
  RunCustomInputParams,
  RunCustomInputResult,
  RunSampleTestCase,
  RunSampleTestsParams,
  RunSampleTestsResult,
  TestCaseResult,
  TestVerdict,
} from '../../shared/types/compiler';

const DEFAULT_TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 15000;
const DEFAULT_COMPILER_PATH = 'g++';
const DEFAULT_COMPILER_FLAGS = ['-std=c++17', '-O2', '-Wall', '-Wextra'];
const DEFAULT_FORMATTER_PATH = 'clang-format';
const FORMAT_TIMEOUT_MS = 5000;
const PLATFORM_NAME = process.platform;

interface ProcessRunOptions {
  cwd?: string;
  stdin?: string;
  timeoutMs: number;
}

interface ProcessRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  errorMessage: string;
}

interface CompileSourceResult {
  compile: CompileResult;
  binaryPath: string | null;
}

/**
 * 配布物同梱 clang-format の候補パス一覧を作る。
 *
 * @returns {string[]} 探索候補の絶対パス配列。
 */
function getBundledFormatterCandidates(): string[] {
  const isWindows = PLATFORM_NAME === 'win32';
  const formatterName = isWindows ? 'clang-format.exe' : 'clang-format';

  const roots = [process.resourcesPath, process.cwd()];
  const candidates = roots.flatMap((root) => [
    join(root, 'bin', PLATFORM_NAME, formatterName),
    join(root, 'bin', formatterName),
  ]);

  // 同じ候補が重複するケースを除外する。
  return [...new Set(candidates)];
}

/**
 * 整形コマンドパスを解決する。同梱を優先し、なければ PATH 上の既定コマンド名を使う。
 *
 * @returns {string} 実行可能ファイルのパスまたはコマンド名。
 */
function resolveFormatterCommand(): string {
  const bundledPath = getBundledFormatterCandidates().find((candidate) => existsSync(candidate));
  return bundledPath ?? DEFAULT_FORMATTER_PATH;
}

/**
 * 実行タイムアウト値を妥当なミリ秒へ正規化する。
 *
 * @param {number | undefined} timeoutMs 指定されたタイムアウト。
 * @returns {number} 実際に使用するタイムアウト値。
 */
function resolveTimeoutMs(timeoutMs: number | undefined): number {
  if (!Number.isFinite(timeoutMs) || timeoutMs == null || timeoutMs <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.floor(timeoutMs);
}

/**
 * 子プロセスを起動し、stdout/stderr/終了情報を収集する。
 *
 * @param {string} command 実行ファイルパス。
 * @param {string[]} args 引数配列。
 * @param {ProcessRunOptions} options 実行オプション。
 * @returns {Promise<ProcessRunResult>} 実行結果。
 */
function runProcess(command: string, args: string[], options: ProcessRunOptions): Promise<ProcessRunResult> {
  return new Promise<ProcessRunResult>((resolve) => {
    const startedAt = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let errorMessage = '';
    let settled = false;

    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
    });

    /**
     * 実行結果を一度だけ確定してPromiseを解決する。
     *
     * @param {number | null} exitCode 終了コード。
     * @returns {void} 値は返さない。
     */
    function settle(exitCode: number | null): void {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        stdout,
        stderr,
        exitCode,
        timedOut,
        durationMs: Date.now() - startedAt,
        errorMessage,
      });
    }

    const timeoutId =
      options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
          }, options.timeoutMs)
        : null;

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error: Error) => {
      errorMessage = error.message;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      settle(null);
    });

    child.on('close', (exitCode: number | null) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      settle(exitCode);
    });

    if (options.stdin != null) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

/**
 * コンパイル失敗時の表示用メッセージを生成する。
 *
 * @param {ProcessRunResult} result コンパイル実行結果。
 * @returns {string} 表示用メッセージ。
 */
function toCompileErrorMessage(result: ProcessRunResult): string {
  if (result.timedOut) {
    return `Compilation timed out (${COMPILE_TIMEOUT_MS}ms)`;
  }

  if (result.errorMessage) {
    return result.errorMessage;
  }

  if (result.stderr.trim()) {
    return result.stderr.trim();
  }

  return 'Compilation failed.';
}

/**
 * 整形失敗時の表示用メッセージを生成する。
 *
 * @param {ProcessRunResult} result 整形実行結果。
 * @returns {string} 表示用メッセージ。
 */
function toFormatErrorMessage(result: ProcessRunResult): string {
  if (result.timedOut) {
    return `Formatting timed out (${FORMAT_TIMEOUT_MS}ms)`;
  }

  if (result.errorMessage) {
    return result.errorMessage;
  }

  if (result.stderr.trim()) {
    return result.stderr.trim();
  }

  return 'Formatting failed.';
}

/**
 * 文字列を出力比較用に正規化する。
 *
 * @param {string} value 出力文字列。
 * @returns {string} 正規化済み文字列。
 */
function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd();
}

/**
 * ソースコードを clang-format で整形する。
 *
 * @param {FormatSourceParams} params 整形リクエスト。
 * @returns {Promise<FormatSourceResult>} 整形結果。
 */
export async function formatSource(params: FormatSourceParams): Promise<FormatSourceResult> {
  const formatterPath = resolveFormatterCommand();
  const result = await runProcess(formatterPath, ['--assume-filename=main.cpp'], {
    stdin: params.sourceCode,
    timeoutMs: FORMAT_TIMEOUT_MS,
  });

  const success = !result.timedOut && !result.errorMessage && result.exitCode === 0;
  return {
    success,
    formattedCode: success ? result.stdout : params.sourceCode,
    errorMessage: success ? '' : toFormatErrorMessage(result),
    stderr: result.stderr,
  };
}

/**
 * テストケースの判定結果を算出する。
 *
 * @param {RunSampleTestCase} testCase テストケース。
 * @param {ProcessRunResult} result 実行結果。
 * @returns {TestVerdict} 判定結果。
 */
function judgeSampleCase(testCase: RunSampleTestCase, result: ProcessRunResult): TestVerdict {
  if (result.timedOut) {
    return 'TLE';
  }

  if (result.exitCode !== 0 || result.errorMessage) {
    return 'RE';
  }

  const expected = normalizeOutput(testCase.expectedOutput);
  const actual = normalizeOutput(result.stdout);
  return expected === actual ? 'AC' : 'WA';
}

/**
 * ソースコードを一時ディレクトリへ保存してコンパイルする。
 *
 * @param {string} sourceCode C++ソースコード。
 * @param {string} workspaceDir 一時作業ディレクトリ。
 * @returns {Promise<CompileSourceResult>} コンパイル結果と生成バイナリパス。
 */
async function compileSource(sourceCode: string, workspaceDir: string): Promise<CompileSourceResult> {
  const sourcePath = join(workspaceDir, 'main.cpp');
  const binaryPath = join(workspaceDir, process.platform === 'win32' ? 'main.exe' : 'main.out');

  await writeFile(sourcePath, sourceCode, 'utf8');

  const compileResult = await runProcess(
    DEFAULT_COMPILER_PATH,
    [...DEFAULT_COMPILER_FLAGS, sourcePath, '-o', binaryPath],
    { cwd: workspaceDir, timeoutMs: COMPILE_TIMEOUT_MS }
  );

  const success = !compileResult.timedOut && !compileResult.errorMessage && compileResult.exitCode === 0;
  const compile: CompileResult = {
    success,
    errorMessage: success ? '' : toCompileErrorMessage(compileResult),
    stdout: compileResult.stdout,
    stderr: compileResult.stderr,
  };

  return {
    compile,
    binaryPath: success ? binaryPath : null,
  };
}

/**
 * サンプルケースを使ってコンパイル・実行し、各ケースの判定を返す。
 *
 * @param {RunSampleTestsParams} params 実行リクエスト。
 * @returns {Promise<RunSampleTestsResult>} サンプルテスト実行結果。
 */
export async function runSampleTests(params: RunSampleTestsParams): Promise<RunSampleTestsResult> {
  const workspaceDir = await mkdtemp(join(tmpdir(), 'cpeditor-'));

  try {
    const { compile, binaryPath } = await compileSource(params.sourceCode, workspaceDir);
    if (!compile.success || !binaryPath) {
      return {
        compile,
        results: [],
      };
    }

    const timeoutMs = resolveTimeoutMs(params.timeoutMs);
    const results: TestCaseResult[] = [];

    for (const testCase of params.testCases) {
      const runResult = await runProcess(binaryPath, [], {
        cwd: workspaceDir,
        stdin: testCase.input,
        timeoutMs,
      });

      results.push({
        caseIndex: testCase.caseIndex,
        caseName: testCase.caseName,
        verdict: judgeSampleCase(testCase, runResult),
        executionTimeMs: runResult.durationMs,
        expectedOutput: testCase.expectedOutput,
        actualOutput: runResult.stdout,
        stderr: runResult.errorMessage ? `${runResult.errorMessage}\n${runResult.stderr}`.trim() : runResult.stderr,
        exitCode: runResult.exitCode,
      });
    }

    return {
      compile,
      results,
    };
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
}

/**
 * カスタム入力でコンパイル・実行を行う。
 *
 * @param {RunCustomInputParams} params 実行リクエスト。
 * @returns {Promise<RunCustomInputResult>} カスタム入出力実行結果。
 */
export async function runCustomInput(params: RunCustomInputParams): Promise<RunCustomInputResult> {
  const workspaceDir = await mkdtemp(join(tmpdir(), 'cpeditor-'));

  try {
    const { compile, binaryPath } = await compileSource(params.sourceCode, workspaceDir);
    if (!compile.success || !binaryPath) {
      return {
        compile,
        result: null,
      };
    }

    const timeoutMs = resolveTimeoutMs(params.timeoutMs);
    const runResult = await runProcess(binaryPath, [], {
      cwd: workspaceDir,
      stdin: params.input,
      timeoutMs,
    });

    const verdict = runResult.timedOut ? 'TLE' : runResult.exitCode === 0 && !runResult.errorMessage ? 'OK' : 'RE';

    return {
      compile,
      result: {
        verdict,
        executionTimeMs: runResult.durationMs,
        stdout: runResult.stdout,
        stderr: runResult.errorMessage ? `${runResult.errorMessage}\n${runResult.stderr}`.trim() : runResult.stderr,
        exitCode: runResult.exitCode,
      },
    };
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
}
