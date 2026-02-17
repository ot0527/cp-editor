/// <reference types="vite/client" />
import type { FetchProblemDetailParams, ProblemDetail, ProblemIndexItem } from '../../shared/types/problem';
import type { FetchSubmissionsParams, SubmissionItem } from '../../shared/types/submission';
import type {
  FormatSourceParams,
  FormatSourceResult,
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
      submissions: {
        fetchByUser: (params: FetchSubmissionsParams) => Promise<SubmissionItem[]>;
      };
      compiler: {
        runSampleTests: (params: RunSampleTestsParams) => Promise<RunSampleTestsResult>;
        runCustomInput: (params: RunCustomInputParams) => Promise<RunCustomInputResult>;
        formatSource: (params: FormatSourceParams) => Promise<FormatSourceResult>;
      };
      app: {
        openExternal: (url: string) => Promise<boolean>;
      };
    };
  }
}
