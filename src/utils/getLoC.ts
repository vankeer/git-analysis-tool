import execa from 'execa';
import path from 'path';
import { LocStats } from 'src/models/LocStats';

const CLOC_PATH = process.env.CLOC_PATH || 'node_modules/.bin/cloc';

export async function getLoC(repoPath: string): Promise<LocStats> {
  // console.log(`Getting LoC from path ${repoPath}`);

  const { stdout, stderr, failed, killed, signal, timedOut } = await execa(
    path.join(CLOC_PATH),
    ['--json', repoPath],
  );

  if (stderr !== '') {
    console.error(`Failed to get LoC`, stderr);
    throw new Error(stderr.trim());
  }
  if (failed !== false) {
    console.error(`Failed to get LoC - failed`);
    throw new Error('Failure');
  }
  if (killed !== false) {
    console.error(`Failed to get LoC - killed`);
    throw new Error('Program was killed');
  }
  if (signal) {
    console.error(`Failed to get LoC - uncaught signal`);
    throw new Error('Uncaught signal');
  }
  if (timedOut !== false) {
    console.error(`Failed to get LoC - timeout`);
    throw new Error('Timeout');
  }

  const parsed = JSON.parse(stdout);

  return {
    tsFiles: parsed.TypeScript?.nFiles || 0,
    tsLines: parsed.TypeScript?.code || 0,
    tsComments: parsed.TypeScript?.comments || 0,
    jsFiles: parsed.JavaScript?.nFiles || 0,
    jsLines: parsed.JavaScript?.code || 0,
    jsComments: parsed.JavaScript?.comments || 0,
    cssFiles: parsed.CSS?.nFiles || 0,
    cssLines: parsed.CSS?.code || 0,
    cssComments: parsed.CSS?.comments || 0,
    scssFiles: parsed.SCSS?.nFiles || 0,
    scssLines: parsed.SCSS?.code || 0,
    scssComments: parsed.SCSS?.comments || 0,
    htmlFiles: parsed.HTML?.nFiles || 0,
    htmlLines: parsed.HTML?.code || 0,
    htmlComments: parsed.HTML?.comments || 0,
    pumlFiles: parsed.PlantUML?.nFiles || 0,
    pumlLines: parsed.PlantUML?.code || 0,
    pumlComments: parsed.PlantUML?.comments || 0,
    mdFiles: parsed.Markdown?.nFiles || 0,
    mdLines: parsed.Markdown?.code || 0,
    mdComments: parsed.Markdown?.comments || 0,
  } as LocStats;
}
