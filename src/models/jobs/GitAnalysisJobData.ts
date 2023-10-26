import { GitAuthorData } from '../GitAuthorData';

export interface GitAnalysisJobData {
  targetPath: string;
  branch: string;
  id: number;
  name: string;
}

export interface GitAnalysisJobReturnValue {
  authorData: GitAuthorData[];
  directorySize: number;
  ccCompliance: number;
  packageJsonFolderPaths: string[];
}
