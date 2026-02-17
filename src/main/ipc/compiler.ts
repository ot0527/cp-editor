import { ipcMain } from 'electron';
import type { FormatSourceParams, RunCustomInputParams, RunSampleTestsParams } from '../../shared/types/compiler';
import { formatSource, runCustomInput, runSampleTests } from '../services/compilerService';

const IPC_CHANNEL_RUN_SAMPLE_TESTS = 'compiler:run-sample-tests';
const IPC_CHANNEL_RUN_CUSTOM_INPUT = 'compiler:run-custom-input';
const IPC_CHANNEL_FORMAT_SOURCE = 'compiler:format-source';

/**
 * コンパイル・実行系IPCハンドラを登録する。
 *
 * @returns {void} 値は返さない。
 */
export function registerCompilerIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNEL_RUN_SAMPLE_TESTS);
  ipcMain.removeHandler(IPC_CHANNEL_RUN_CUSTOM_INPUT);
  ipcMain.removeHandler(IPC_CHANNEL_FORMAT_SOURCE);

  ipcMain.handle(IPC_CHANNEL_RUN_SAMPLE_TESTS, async (_event, params: RunSampleTestsParams) => {
    return runSampleTests(params);
  });

  ipcMain.handle(IPC_CHANNEL_RUN_CUSTOM_INPUT, async (_event, params: RunCustomInputParams) => {
    return runCustomInput(params);
  });

  ipcMain.handle(IPC_CHANNEL_FORMAT_SOURCE, async (_event, params: FormatSourceParams) => {
    return formatSource(params);
  });
}
