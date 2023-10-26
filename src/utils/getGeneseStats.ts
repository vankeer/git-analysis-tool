import execa from 'execa';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import { GeneseStats } from 'src/models/GeneseStats';

const CLOC_PATH = process.env.GENESE_PATH || 'node_modules/.bin/genese';

export async function getGeneseStats(targetPath: string): Promise<GeneseStats> {
  // console.log(`Getting complexity stats from ${targetPath}`);

  let cleanAst = true;
  let cleanGeneseFolder = true;

  try {
    if (fs.existsSync(path.join(targetPath, 'ast.json'))) {
      cleanAst = false;
    }

    if (fs.existsSync(path.join(targetPath, 'genese'))) {
      cleanGeneseFolder = false;
    }

    const { stdout, stderr, failed, killed, signal, timedOut } = await execa(
      'genese',
      ['cpx', targetPath],
      {
        cwd: targetPath,
      },
    );

    // if (stderr !== '') {
    //   throw new Error(stderr.trim());
    // }
    if (failed !== false) {
      throw new Error('Failure');
    }
    if (killed !== false) {
      throw new Error('Program was killed');
    }
    if (signal) {
      throw new Error(`Uncaught signal: ${signal}`);
    }
    if (timedOut !== false) {
      throw new Error('Timeout');
    }

    const files = extractNumber(stdout, /Files\s*:\s*(\d+)/);
    const methods = extractNumber(stdout, /Methods\s*:\s*(\d+)/);
    const linesOfCode = extractNumber(stdout, /Lines of code\s*:\s*(\d+)/);
    const cognitiveComplexity = extractNumber(
      stdout,
      /Cognitive Complexity\s*:\s*([\d.]+)/,
    );
    const cyclomaticComplexity = extractNumber(
      stdout,
      /Cyclomatic Complexity\s*:\s*(\d+)/,
    );

    const result = {
      files,
      methods,
      linesOfCode,
      cognitiveComplexity,
      cyclomaticComplexity,
    } as GeneseStats;

    console.log('Returning result', result);

    return result;
  } catch (error) {
    console.error(`Failed to get complexity stats`, error);
    throw error;
  } finally {
    // Clean up artifacts
    if (cleanAst && fs.existsSync(path.join(targetPath, 'ast.json'))) {
      console.log('removing ast.json');
      fs.unlinkSync(path.join(targetPath, 'ast.json'));
    }

    if (cleanGeneseFolder && fs.existsSync(path.join(targetPath, 'genese'))) {
      console.log('removing genese folder');
      rimraf.sync(path.join(targetPath, 'genese'));
    }
  }
}

function extractNumber(input: string, regex: RegExp): number {
  const match = input.match(regex);
  if (!match) {
    throw new Error(`Failed to extract number using regex ${regex}`);
  }
  return parseFloat(match[1]);
}
