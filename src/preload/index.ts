import { contextBridge } from 'electron';

/**
 * レンダラープロセスへ安全に公開する最小限のAPIを登録する。
 *
 * @returns {void} 値は返さない。
 */
function exposeBridgeApi(): void {
  contextBridge.exposeInMainWorld('cpeditor', {
    version: '0.1.0',
  });
}

exposeBridgeApi();
