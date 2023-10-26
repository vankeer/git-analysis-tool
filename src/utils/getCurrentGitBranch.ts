import simpleGit from 'simple-git';

export async function getCurrentGitBranch(repoDir: string): Promise<string> {
  const status = await simpleGit(repoDir).status();
  return status.current;
}
