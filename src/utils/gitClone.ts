import fs from 'fs';
import simpleGit from 'simple-git';

export async function gitClone(
  repoUrl: string,
  branch: string,
  targetPath: string,
) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { force: true, recursive: true });
  }
  return new Promise((resolve, reject) => {
    simpleGit().clone(
      repoUrl,
      targetPath,
      [
        '-b',
        branch,
        // , '--depth', '1' // commented out so we can perform git log analysis
      ],
      (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      },
    );
  });
}
