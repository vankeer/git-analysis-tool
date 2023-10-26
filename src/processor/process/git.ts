import fs from 'fs';
import path from 'path';
import { Job, DoneCallback } from 'bull';
import { gitPull } from 'src/utils/gitPull';
import { gitClone } from 'src/utils/gitClone';
import { GitAnalysisJobData } from 'src/models/jobs/GitAnalysisJobData';
import { GitJobData } from 'src/models/jobs/GitJobData';

const outputDir = process.env.GIT_OUTPUT_DIR;

if (!outputDir || outputDir === '/') {
  throw new Error(`Invalid GIT_OUTPUT_DIR config: ${outputDir}`);
}

export default async function (job: Job<GitJobData>, cb: DoneCallback) {
  try {
    const { repoUrl, branch, id, name, skipFetch } = job.data;

    if (!repoUrl || !branch || !id || !name) {
      throw new Error('Missing GitJobData');
    }

    console.log(`[${process.pid}] Processing: fetching git repo ${name}`);

    const targetPath = path.join(
      outputDir,
      `${id}_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
    );
    if (fs.existsSync(targetPath)) {
      if (!skipFetch) {
        console.log(
          `[${process.pid}] Repo already exists, pulling to ${targetPath}`,
        );
        await gitPull(targetPath);
      }
    } else {
      console.log(
        `[${process.pid}] Repo does not exist yet, cloning to ${targetPath}`,
      );
      await gitClone(repoUrl, branch, targetPath);
    }

    cb(null, { targetPath, id, name, branch } as GitAnalysisJobData);
  } catch (error) {
    cb(error);
  }
}
