import simpleGit, { SimpleGit } from 'simple-git';
import { resolve } from 'path';
import { GitAuthorData } from 'src/models/GitAuthorData';

export async function getGitAuthorData(
  repoPath: string,
  targetPath?: string,
): Promise<Map<string, GitAuthorData>> {
  const git: SimpleGit = simpleGit(repoPath);
  const absolutePath = resolve(targetPath || repoPath);
  const authorsMap: Map<string, GitAuthorData> = new Map();
  try {
    // Note that this does not include merge commits (add -m for merge commits)
    const log = await git.log(['--shortstat', '--follow', absolutePath]);
    log.all.forEach((commit) => {
      const name = commit.author_name;
      const email = commit.author_email;
      const authorKey = `${name} <${email}>`;

      let author = {
        name: commit.author_name,
        email: commit.author_email,
        commits: 0,
        lines: 0,
        linesChanged: 0,
        lineInsertions: 0,
        lineDeletions: 0,
        firstActivity: '',
        lastActivity: commit.date,
      } as GitAuthorData;

      if (authorsMap.has(authorKey)) {
        author = authorsMap.get(authorKey) as GitAuthorData;
      }

      author.commits++;

      if (commit.diff) {
        // note that this diff property is suppressed in MR commits
        author.lines +=
          commit.diff.changed + commit.diff.insertions + commit.diff.deletions;
        author.linesChanged += commit.diff.changed;
        author.lineInsertions += commit.diff.insertions;
        author.lineDeletions += commit.diff.deletions;
      }

      // will always be last
      author.firstActivity = commit.date;

      authorsMap.set(authorKey, author);
    });
  } catch (error) {
    // Do not throw this error, but log it
    console.error('Error counting git commits', error);
  }
  return authorsMap;
}
