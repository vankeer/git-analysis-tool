import * as fs from 'fs';
import * as path from 'path';

export function findTypescriptSrcFolder(targetPath: string): string | null {
  try {
    const absolutePath = path.resolve(targetPath);

    // Check if the target path exists and it is a directory
    if (
      !fs.existsSync(absolutePath) ||
      !fs.statSync(absolutePath).isDirectory()
    ) {
      console.error(`Invalid path: ${absolutePath}`);
      return null;
    }

    // Check for the existence of tsconfig.json
    const tsconfigPath = path.join(absolutePath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      return null; // tsconfig.json not found, not a TypeScript project
    }

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const srcFolderRelativePath = tsconfig.compilerOptions?.rootDir || 'src';
    const srcFolderPath = path.join(absolutePath, srcFolderRelativePath);

    // Check if the src folder exists, return it if it does, else return the project root folder
    return fs.existsSync(srcFolderPath) &&
      fs.statSync(srcFolderPath).isDirectory()
      ? srcFolderPath
      : absolutePath;
  } catch (error) {
    console.error(`Error occurred: ${error}`);
  }
  return null;
}
