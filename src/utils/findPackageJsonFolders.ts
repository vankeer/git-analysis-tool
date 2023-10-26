import * as fs from 'fs';
import * as path from 'path';

export function findPackageJsonFolders(targetPath: string): string[] {
  const absolutePath = path.resolve(targetPath);
  const result: string[] = [];

  if (
    !fs.existsSync(absolutePath) ||
    !fs.statSync(absolutePath).isDirectory()
  ) {
    console.error(`Invalid path: ${absolutePath}`);
    return result;
  }

  function traverse(dirPath: string) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        traverse(filePath);
      } else {
        if (filePath.endsWith('package.json')) {
          result.push(path.dirname(filePath));
        }
      }
    }
  }

  traverse(absolutePath);
  // console.log('=== traversing ... ' + absolutePath);
  return result;
}
