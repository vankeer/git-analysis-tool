import * as fs from 'fs';
import * as path from 'path';

export function identifyProjectTypes(
  folderPath: string,
  packageJson: any,
): string[] {
  const projectTypes: string[] = [];

  if (!packageJson) {
    return projectTypes;
  }

  if (packageJson.dependencies || packageJson.devDependencies) {
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (dependencies.react) {
      projectTypes.push('react');
    }
    if (dependencies.vue) {
      projectTypes.push('vue');
    }
    if (dependencies.svelte) {
      projectTypes.push('svelte');
    }
    if (dependencies.next) {
      projectTypes.push('next.js');
    }
    if (dependencies['@nestjs/core']) {
      projectTypes.push('nest.js');
    }
    if (dependencies.express) {
      projectTypes.push('express');
    }
  }

  if (fs.existsSync(path.join(folderPath, 'nx.json'))) {
    projectTypes.push('nx');
  }
  if (fs.existsSync(path.join(folderPath, 'angular.json'))) {
    projectTypes.push('angular');
  }

  return projectTypes.length ? projectTypes : ['unknown'];
}
