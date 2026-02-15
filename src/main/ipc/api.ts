import { ipcMain, shell } from 'electron';
import type { FetchProblemDetailParams } from '../../shared/types/problem';
import { fetchProblemIndex } from '../services/atcoderApiService';
import { fetchProblemDetail } from '../services/scraperService';

const IPC_CHANNEL_FETCH_PROBLEMS = 'api:fetch-problems';
const IPC_CHANNEL_FETCH_PROBLEM_DETAIL = 'api:fetch-problem-detail';
const IPC_CHANNEL_OPEN_EXTERNAL = 'app:open-external';

/**
 * 外部URLとして開いてよいURLかを検証する。
 *
 * @param {string} url 検証対象URL。
 * @returns {boolean} 許可する場合true。
 */
function canOpenExternalUrl(url: string): boolean {
  return /^https:\/\/atcoder\.jp\//.test(url);
}

/**
 * API・スクレイピング関連IPCハンドラを登録する。
 *
 * @returns {void} 値は返さない。
 */
export function registerApiIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNEL_FETCH_PROBLEMS);
  ipcMain.removeHandler(IPC_CHANNEL_FETCH_PROBLEM_DETAIL);
  ipcMain.removeHandler(IPC_CHANNEL_OPEN_EXTERNAL);

  ipcMain.handle(IPC_CHANNEL_FETCH_PROBLEMS, async () => fetchProblemIndex());

  ipcMain.handle(IPC_CHANNEL_FETCH_PROBLEM_DETAIL, async (_event, params: FetchProblemDetailParams) => {
    return fetchProblemDetail(params);
  });

  ipcMain.handle(IPC_CHANNEL_OPEN_EXTERNAL, async (_event, url: string) => {
    if (!canOpenExternalUrl(url)) {
      return false;
    }

    await shell.openExternal(url);
    return true;
  });
}
