import fs from 'fs';
import path from 'path';

export function readAngularComponentPrefixes(
  angularProjectDirectory: string,
): string[] {
  const angularFilePath = path.join(angularProjectDirectory, 'angular.json');
  if (fs.existsSync(angularFilePath)) {
    const angularConfig = fs.readFileSync(angularFilePath, 'utf8');
    try {
      const config = JSON.parse(angularConfig);
      if (config.projects) {
        return Object.keys(config.projects)
          .map((p) => config.projects[p].prefix)
          .filter((p) => !!p);
      }
      return [];
    } catch (error) {
      console.error(`Error parsing angular.json in ${angularFilePath}`);
    }
  }
  console.error(`angular.json not found in ${angularProjectDirectory}`);
  return [];
}
