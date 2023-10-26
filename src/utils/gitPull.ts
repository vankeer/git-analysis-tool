import simpleGit, { ResetMode } from 'simple-git';
import { getCurrentGitBranch } from './getCurrentGitBranch';

export async function gitPull(repoDir: string, branch?: string) {
  const git = simpleGit(repoDir);
  const currentBranch = await getCurrentGitBranch(repoDir);
  if (branch) {
    if (currentBranch !== branch) {
      await git.checkoutBranch(branch, `origin/${branch}`);
    }
  } else {
    branch = currentBranch;
  }
  await git.reset(ResetMode.HARD);
  await git.pull(['origin', branch]);
}
