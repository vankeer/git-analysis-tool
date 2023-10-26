import fs from 'fs';
import path from 'path';
import { ANGULAR_ELEMENTS } from 'src/constants/angular-elements';
import { HTML_ELEMENTS } from 'src/constants/html-elements';
import { PRIMENG_ELEMENTS } from 'src/constants/primeng-elements';
import { AngularComponent } from 'src/models/AngularComponent';

// Set the file extension for Angular component files
const componentExt = '.ts';
const templateExt = '.html';

const componentRegex = /<([a-zA-Z][a-zA-Z0-9-]*)/g;

function extractAngularComponentsFromHTML(
  html: string,
  projectPrefixes: string[],
): AngularComponent[] {
  const components = [];
  let componentMatch;
  while ((componentMatch = componentRegex.exec(html)) !== null) {
    // Note: ignoring case for now...
    const componentName = componentMatch[1];
    if (
      HTML_ELEMENTS.includes(componentName) ||
      ANGULAR_ELEMENTS.includes(componentName)
    ) {
      // skip the html elements
      continue;
    }

    const component: AngularComponent = {
      name: componentName,
      type: 'unknown',
    };

    for (const p of projectPrefixes) {
      if (componentName.startsWith(p)) {
        component.type = 'local';
      }
    }

    if (!component.type) {
      if (PRIMENG_ELEMENTS.includes(componentName)) {
        component.type = 'primeng';
      } else if (componentName.startsWith('fa-')) {
        component.type = 'fa';
      } else {
        component.type = 'custom';
      }
    }

    components.push(component);
  }
  return components;
}

function extractAngularComponentsFromTemplate(
  templatePath: string,
  prefixes: string[],
): AngularComponent[] {
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  return extractAngularComponentsFromHTML(templateContent, prefixes);
}

function extractAngularComponentsFromTypeScript(
  pathToComponentFile: string,
  prefixes: string[],
): AngularComponent[] {
  const components = [];
  const componentFile = fs.readFileSync(pathToComponentFile, 'utf8');
  const templateRegex = /template(Url)?\s*:\s*['"`]([^'`"]+)['"`]/g;
  let templateMatch;
  while ((templateMatch = templateRegex.exec(componentFile)) !== null) {
    if (templateMatch.length !== 3 || !templateMatch[2]) {
      return;
    }
    if (templateMatch[1]) {
      // it's a URL
      const templatePath = path.join(
        path.dirname(pathToComponentFile),
        templateMatch[2],
      );
      components.push(
        ...extractAngularComponentsFromTemplate(templatePath, prefixes),
      );
    } else {
      // it's a template
      components.push(
        ...extractAngularComponentsFromHTML(templateMatch[2], prefixes),
      );
    }
  }
  return components;
}

export function extractAngularComponents(
  pathToFile: string,
  prefixes: string[],
): AngularComponent[] {
  if (pathToFile.endsWith(componentExt)) {
    return extractAngularComponentsFromTypeScript(pathToFile, prefixes);
  } else if (pathToFile.endsWith(templateExt)) {
    return extractAngularComponentsFromHTML(pathToFile, prefixes);
  }
  return [];
}
