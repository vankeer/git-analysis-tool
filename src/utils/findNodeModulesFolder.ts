import * as fs from 'fs';
import * as path from 'path';

export function findNodeModulesFolder(targetPath: string): string | null {
  // Check if the path exists
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    console.error(`Invalid path: ${targetPath}`);
    return null;
  }

  const stack: string[] = [targetPath];

  while (stack.length > 0) {
    const dirPath = stack.pop() as string;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);

      if (fs.statSync(filePath).isDirectory()) {
        if (file === 'node_modules') {
          return path.relative(targetPath, filePath);
        } else {
          stack.push(filePath);
        }
      }
    }
  }

  return null;
}
