/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    cpeditor: {
      version: string;
    };
  }
}
