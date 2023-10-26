import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Queue } from 'bull';

import { LoggerService } from '../logger/logger.service';
import { NodeProjectAnalysisJobData } from 'src/models/jobs/NodeProjectAnalysisJobData';
import { GraphService } from '../graph/graph.service';
import { GitlabService } from '../gitlab/gitlab.service';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly graphService: GraphService,
    private readonly logger: LoggerService,
  ) {
    logger.setContext(ProjectController.name);
  }

  @Get('analyze/:id')
  async analyzeProject(@Param('id') id: string) {
    // const gitRepoResult = await this.graphService.getGitRepositoryNode(body.id);
    // console.log(gitRepo);
    // this.nodeProjectAnalysisQueue.add({
    //   id: gitRepo.records,
    //   name: gitRepo.name,
    //   repoPath: job.data.targetPath,
    //   packageJsonFolderPath,
    // } as NodeProjectAnalysisJobData);
  }
}
