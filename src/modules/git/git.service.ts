import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getCurrentGitBranch } from 'src/utils/getCurrentGitBranch';
import { gitPull } from 'src/utils/gitPull';
import { gitClone } from 'src/utils/gitClone';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class GitService {
  outputDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    logger.setContext(GitService.name);

    this.outputDir = config.get('GIT_OUTPUT_DIR') || './output/git';
    if (!this.outputDir || this.outputDir === '/') {
      throw new Error(`Invalid GIT_OUTPUT_DIR config: ${this.outputDir}`);
    }

    fs.mkdirSync(this.outputDir, { recursive: true });
    this.logger.verbose(
      `Created output directory for Git repositories: ${this.outputDir}`,
    );
  }

  async sync(repoUrl: string, branch: string, name: string) {
    const targetPath = path.join(this.outputDir, name);
    if (fs.existsSync(targetPath)) {
      await this.pull(targetPath);
    } else {
      await this.clone(repoUrl, branch, name);
    }
  }

  clone(repoUrl: string, branch: string, name: string) {
    return gitClone(repoUrl, branch, name);
  }

  pull(repoDir: string, branch?: string) {
    return gitPull(repoDir, branch);
  }

  getCurrentBranch(repoDir: string): Promise<string> {
    return getCurrentGitBranch(repoDir);
  }
}
