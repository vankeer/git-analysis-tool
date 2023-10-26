import fs from 'fs';
import { Job, DoneCallback } from 'bull';
import { getGitAuthorData } from 'src/utils/getGitAuthorData';
import { GitAuthorData } from 'src/models/GitAuthorData';
import { getDirectorySize } from 'src/utils/getDirectorySize';
import { findPackageJsonFolders } from 'src/utils/findPackageJsonFolders';
import { getTotalConventionalCommitsCompliance } from 'src/utils/getTotalConventionalCommitsCompliance';
import {
  GitAnalysisJobData,
  GitAnalysisJobReturnValue,
} from 'src/models/jobs/GitAnalysisJobData';

const outputDir = process.env.GIT_OUTPUT_DIR;

if (!outputDir || outputDir === '/') {
  throw new Error(`Invalid GIT_OUTPUT_DIR config: ${outputDir}`);
}

export default async function (job: Job<GitAnalysisJobData>, cb: DoneCallback) {
  try {
    const { targetPath, branch, id, name } = job.data;

    if (!targetPath || !branch || !id || !name) {
      throw new Error(`[${process.pid}] Missing GitAnalysisJobData`);
    }

    console.log(`[${process.pid}] Processing: analyzing git repo ${name}`);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`[${process.pid}] Repo does not exist: ${targetPath}`);
    }

    const authorData: GitAuthorData[] = Array.from(
      (await getGitAuthorData(targetPath)).values(),
    ).sort((a, z) => z.commits - a.commits);
    const directorySize: number = await getDirectorySize(targetPath);
    const ccCompliance: number =
      await getTotalConventionalCommitsCompliance(targetPath);
    const packageJsonFolderPaths: string[] = findPackageJsonFolders(targetPath);

    cb(null, {
      authorData,
      directorySize,
      ccCompliance,
      packageJsonFolderPaths,
    } as GitAnalysisJobReturnValue);
  } catch (error) {
    cb(error);
  }
}
