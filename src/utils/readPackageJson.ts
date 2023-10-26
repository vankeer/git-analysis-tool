import * as fs from 'fs';
import * as path from 'path';

export function readPackageJson(targetPath: string): object | null {
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`package.json not found in: ${targetPath}`);
    return null;
  }

  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(packageJsonContent);
}
