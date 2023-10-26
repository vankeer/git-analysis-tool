import { AngularComponent } from '../AngularComponent';
import { GeneseStats } from '../GeneseStats';
import { GitAuthorData } from '../GitAuthorData';
import { LocStats } from '../LocStats';

export interface NodeProjectAnalysisJobData {
  repoPath: string;
  packageJsonFolderPath: string;
  id: number;
  name: string;
  nodeProjectId: string;
}

export interface NodeProjectAnalysisJobReturnValue
  extends NodeProjectAnalysisJobData {
  packageJson: Record<string, any> | null;
  hasNodeModules: string | null;
  authorData: GitAuthorData[];
  directorySize: number;
  projectTypes: string[];
  srcFolder: string | null;
  locStats: LocStats | null;
  complexity: GeneseStats | null;
  angularComponents: AngularComponent[];
}
