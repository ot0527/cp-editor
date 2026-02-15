import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('cpeditor', {
  version: '0.1.0',
});
