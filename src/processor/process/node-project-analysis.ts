import fs from 'fs';
import { Job, DoneCallback } from 'bull';
import { LocStats } from 'src/models/LocStats';
import { getLoC } from 'src/utils/getLoC';
import { GeneseStats } from 'src/models/GeneseStats';
import { getGeneseStats } from 'src/utils/getGeneseStats';
import { getGitAuthorData } from 'src/utils/getGitAuthorData';
import { GitAuthorData } from 'src/models/GitAuthorData';
import { getDirectorySize } from 'src/utils/getDirectorySize';
import { findNodeModulesFolder } from 'src/utils/findNodeModulesFolder';
import { findTypescriptSrcFolder } from 'src/utils/findTypescriptSrcFolder';
import { readPackageJson } from 'src/utils/readPackageJson';
import { identifyProjectTypes } from 'src/utils/identifyProjectTypes';
import {
  NodeProjectAnalysisJobData,
  NodeProjectAnalysisJobReturnValue,
} from 'src/models/jobs/NodeProjectAnalysisJobData';
import { AngularComponent } from 'src/models/AngularComponent';
import { findAngularComponentsInDirectory } from 'src/utils/findAngularComponentsInDirectory';

const outputDir = process.env.GIT_OUTPUT_DIR;

if (!outputDir || outputDir === '/') {
  throw new Error(`Invalid GIT_OUTPUT_DIR config: ${outputDir}`);
}

export default async function (
  job: Job<NodeProjectAnalysisJobData>,
  cb: DoneCallback,
) {
  try {
    const { repoPath, packageJsonFolderPath, id, name } = job.data;

    if (!repoPath || !packageJsonFolderPath || !id || !name) {
      console.error(`[${process.pid}] Missing NodeProjectAnalysisJobData`);
      throw new Error(`[${process.pid}] Missing NodeProjectAnalysisJobData`);
    }

    console.log(
      `[${process.pid}] Processing: analyzing Node path ${packageJsonFolderPath}`,
    );

    if (!fs.existsSync(packageJsonFolderPath)) {
      throw new Error(
        `[${process.pid}] Package.json folder does not exist: ${packageJsonFolderPath}`,
      );
    }

    const authorData: GitAuthorData[] = Array.from(
      (await getGitAuthorData(repoPath, packageJsonFolderPath)).values(),
    ).sort((a, z) => z.commits - a.commits);

    // console.log(`[${process.pid}] Found ${authorData.length} authors`);

    const directorySize: number = await getDirectorySize(packageJsonFolderPath);

    // console.log(`[${process.pid}] Got directory size: ${directorySize}`);

    const hasNodeModules: string | null = findNodeModulesFolder(
      packageJsonFolderPath,
    );

    // console.log(`[${process.pid}] Has node_modules: ${hasNodeModules}`);

    const packageJson = readPackageJson(packageJsonFolderPath);

    // console.log(`[${process.pid}] Read package.json`);

    const projectTypes: string[] = identifyProjectTypes(
      packageJsonFolderPath,
      packageJson,
    );

    console.log(
      `[${process.pid}] Identified project types: ${projectTypes.join(',')}`,
    );

    const srcFolder: string | null = findTypescriptSrcFolder(
      packageJsonFolderPath,
    );

    console.log(`[${process.pid}] Found src folder: ${srcFolder}`);

    let locStats: LocStats | null = null;
    let complexity: GeneseStats | null = null;
    let angularComponents: AngularComponent[] = [];

    if (srcFolder) {
      locStats = await getLoC(srcFolder);
      console.log(`[${process.pid}] Got LoC stats from ${srcFolder}`);

      complexity = await getGeneseStats(srcFolder);
      console.log(`[${process.pid}] Got Genese complexity stats`);

      if (projectTypes.includes('angular')) {
        angularComponents = findAngularComponentsInDirectory(srcFolder) || [];
        console.log(
          `[${process.pid}] Found ${angularComponents.length} ng components`,
        );
      }
    }

    console.log(`[${process.pid}] Process complete`);

    cb(null, {
      ...job.data,
      packageJson,
      hasNodeModules,
      authorData,
      directorySize,
      projectTypes,
      srcFolder,
      locStats,
      complexity,
      angularComponents,
    } as NodeProjectAnalysisJobReturnValue);
  } catch (error) {
    cb(error);
  }
}
