/// <reference types="vite/client" />
import type { FetchProblemDetailParams, ProblemDetail, ProblemIndexItem } from '../../shared/types/problem';
import type {
  RunCustomInputParams,
  RunCustomInputResult,
  RunSampleTestsParams,
  RunSampleTestsResult,
} from '../../shared/types/compiler';

export {};

declare global {
  interface Window {
    cpeditor: {
      version: string;
      problems: {
        fetchIndex: () => Promise<ProblemIndexItem[]>;
        fetchDetail: (params: FetchProblemDetailParams) => Promise<ProblemDetail>;
      };
      compiler: {
        runSampleTests: (params: RunSampleTestsParams) => Promise<RunSampleTestsResult>;
        runCustomInput: (params: RunCustomInputParams) => Promise<RunCustomInputResult>;
      };
      app: {
        openExternal: (url: string) => Promise<boolean>;
      };
    };
  }
}
