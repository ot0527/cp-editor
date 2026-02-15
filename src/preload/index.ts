import { contextBridge, ipcRenderer } from 'electron';
import type { FetchProblemDetailParams, ProblemDetail, ProblemIndexItem } from '../shared/types/problem';

/**
 * レンダラープロセスへ安全に公開する最小限のAPIを登録する。
 *
 * @returns {void} 値は返さない。
 */
function exposeBridgeApi(): void {
  contextBridge.exposeInMainWorld('cpeditor', {
    version: '0.1.0',
    problems: {
      /**
       * AtCoder Problems APIから問題一覧を取得する。
       *
       * @returns {Promise<ProblemIndexItem[]>} 問題一覧。
       */
      fetchIndex: () => ipcRenderer.invoke('api:fetch-problems') as Promise<ProblemIndexItem[]>,
      /**
       * 選択中問題の詳細（スクレイピング結果）を取得する。
       *
       * @param {FetchProblemDetailParams} params 取得対象の問題情報。
       * @returns {Promise<ProblemDetail>} 問題詳細。
       */
      fetchDetail: (params: FetchProblemDetailParams) =>
        ipcRenderer.invoke('api:fetch-problem-detail', params) as Promise<ProblemDetail>,
    },
    app: {
      /**
       * 指定URLをOS標準ブラウザで開く。
       *
       * @param {string} url 開くURL。
       * @returns {Promise<boolean>} 実行可否。
       */
      openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url) as Promise<boolean>,
    },
  });
}

exposeBridgeApi();
