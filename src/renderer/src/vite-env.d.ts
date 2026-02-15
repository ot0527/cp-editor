/// <reference types="vite/client" />
import type { FetchProblemDetailParams, ProblemDetail, ProblemIndexItem } from '../../shared/types/problem';

export {};

declare global {
  interface Window {
    cpeditor: {
      version: string;
      problems: {
        fetchIndex: () => Promise<ProblemIndexItem[]>;
        fetchDetail: (params: FetchProblemDetailParams) => Promise<ProblemDetail>;
      };
      app: {
        openExternal: (url: string) => Promise<boolean>;
      };
    };
  }
}
