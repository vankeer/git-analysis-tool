import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { GitlabService } from './gitlab.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { GitJobData } from 'src/models/jobs/GitJobData';
import { LoggerService } from '../logger/logger.service';
import { NodeProjectAnalysisJobData } from 'src/models/jobs/NodeProjectAnalysisJobData';

@Controller('gitlab')
export class GitlabController {
  constructor(
    private readonly logger: LoggerService,
    private readonly gitlabService: GitlabService,
    @InjectQueue('git') private readonly gitQueue: Queue,
    @InjectQueue('node-project-analysis')
    private readonly nodeProjectAnalysisQueue: Queue,
  ) {
    logger.setContext(GitlabController.name);
  }

  @Get('/page/:pageId')
  async getProjectsPage(@Param('pageId') pageId: number) {
    const { projects, paginationInfo } = await this.gitlabService.getProjects(
      pageId,
      80,
    );
    return projects.map((p) => p.path_with_namespace);
  }

  @Get()
  getAllProjects() {
    return this.gitlabService.fetchAllProjects();
  }

  @Get('process-cached')
  async processCached() {
    let cached = await this.gitlabService.getAllCached();
    // cached = cached.filter(
    //   (c) => c.project && !c.ignore && c.packageJsonFolderPaths?.length > 0,
    // );
    cached = cached.filter((c) => c.project && !c.ignore);
    this.logger.log(
      `Processing ${cached.length} projects cached in the SQLite db`,
    );
    for (const c of cached) {
      const project = c.project;
      this.logger.verbose(
        `Adding to git queue: ${project.name_with_namespace}`,
      );
      this.gitQueue.add({
        repoUrl: project.ssh_url_to_repo,
        branch: project.default_branch,
        id: project.id,
        name: project.name_with_namespace,
        skipFetch: true,
      } as GitJobData);
    }
  }

  @Get('analyze/:id/:type')
  async analyzeProject(
    @Param('id') id: number,
    @Param('type') type: 'git' | 'node' = 'git',
  ) {
    const project = await this.gitlabService.getById(id);

    if (!project?.project) {
      throw new NotFoundException('id not found');
    }

    if (type === 'git') {
      await this.gitQueue.add({
        repoUrl: project.project.ssh_url_to_repo,
        branch: project.project.default_branch,
        id: project.id,
        name: project.project.name_with_namespace,
      } as GitJobData);
    } else if (type === 'node') {
      for (const p of project.packageJsonFolderPaths || []) {
        await this.nodeProjectAnalysisQueue.add({
          id: project.id,
          name: project.project.name,
          repoPath: project.localPath,
          packageJsonFolderPath: p,
        } as NodeProjectAnalysisJobData);
      }
    }
  }
}
