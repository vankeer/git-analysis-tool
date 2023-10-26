import fs from 'fs';
import path from 'path';
import { extractAngularComponents } from './extractAngularComponents';
import { readAngularComponentPrefixes } from './readAngularComponentPrefixes';
import { AngularComponent } from 'src/models/AngularComponent';

const skipDirectories = [
  '.git',
  '.angular',
  '.cache',
  'cache',
  'coverage',
  'node_modules',
  'dist',
];

export function findAngularComponentsInDirectory(
  folderPath: string,
  prefixes: string[] | null = null,
): AngularComponent[] {
  // Initialize an empty array to store the component names
  const components = [];

  // Read the default component prefix(es)
  if (!prefixes) {
    prefixes = readAngularComponentPrefixes(folderPath);
  }

  // Read all files in the directory
  fs.readdirSync(folderPath, { withFileTypes: true }).forEach((dirent) => {
    const currentPath = path.join(folderPath, dirent.name);
    if (skipDirectories.includes(dirent.name)) {
      return;
    }
    // If the current file is a directory, recursively search it
    if (dirent.isDirectory()) {
      components.push(
        ...findAngularComponentsInDirectory(currentPath, prefixes),
      );
    } else {
      components.push(...extractAngularComponents(currentPath, prefixes));
    }
  });

  // Return the list of components
  return components;
}
