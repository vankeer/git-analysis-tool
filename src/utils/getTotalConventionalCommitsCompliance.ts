import simpleGit from 'simple-git';
import { CONVENTIONAL_COMMITS_REGEX } from 'src/constants/conventional-commits-regex';

/**
 * Simple function for fetching the total ccCompliance for a given repo path.
 *
 * @param repoPath
 * @returns the total ccCompliance for the given repo path.
 */
export async function getTotalConventionalCommitsCompliance(
  repoPath: string,
): Promise<number> {
  const git = simpleGit(repoPath);
  const commits = await git.log(['--reverse', '--shortstat']);

  let totalCcCommits = 0;
  let totalCommitsNonMR = 0;

  commits.all.forEach((commit) => {
    if (commit.message.startsWith('Merge branch')) {
      return;
    }

    totalCommitsNonMR++;

    if (CONVENTIONAL_COMMITS_REGEX.test(commit.message)) {
      totalCcCommits++;
    }
  });

  if (totalCommitsNonMR === 0) {
    return 0;
  }

  const totalCcCompliance =
    Math.round((totalCcCommits / totalCommitsNonMR) * 100) / 100;
  return totalCcCompliance;
}
