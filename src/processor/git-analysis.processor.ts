import { InjectQueue, OnQueueCompleted, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import {
  GitAnalysisJobData,
  GitAnalysisJobReturnValue,
} from 'src/models/jobs/GitAnalysisJobData';
import { NodeProjectAnalysisJobData } from 'src/models/jobs/NodeProjectAnalysisJobData';
import { GitlabService } from 'src/modules/gitlab/gitlab.service';
import { GraphService } from 'src/modules/graph/graph.service';
import { LoggerService } from 'src/modules/logger/logger.service';
import { NodeProjectEntity } from 'src/modules/project/entities/node-project.entity';
import { ProjectService } from 'src/modules/project/project.service';

@Processor('git-analysis')
export class GitAnalysisProcessor {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue('node-project-analysis')
    private readonly nodeProjectAnalysisQueue: Queue,
    private readonly gitlabService: GitlabService,
    private readonly graphService: GraphService,
    private readonly nodeProjectService: ProjectService,
  ) {
    logger.setContext(GitAnalysisProcessor.name);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<GitAnalysisJobData>) {
    this.logger.verbose(`Completed git analysis of ${job.data.name}`);

    const { authorData, directorySize, ccCompliance, packageJsonFolderPaths } =
      job.returnvalue as GitAnalysisJobReturnValue;

    // update database
    const gitlabProject = await this.gitlabService.markAsDownloaded(
      job.data.id,
      job.data.targetPath,
      directorySize,
      ccCompliance,
      packageJsonFolderPaths,
    );

    if (gitlabProject.ignore) {
      this.logger.verbose(
        `Ignoring project ${job.data.name} (id: ${job.data.id})`,
      );
      return;
    }

    // update Neo4j node
    await this.graphService.createGitlabRepositoryNode(gitlabProject);

    // process each Node package in this repo
    this.logger.verbose(
      `Found ${packageJsonFolderPaths.length} node projects in ${
        job.data.name
      }${packageJsonFolderPaths.length ? ' - queuing' : ''}`,
    );
    for (const packageJsonFolderPath of packageJsonFolderPaths) {
      const nodeProjectId = `${job.data.id}_${job.data.name}_${packageJsonFolderPath}`;

      const data = {
        id: job.data.id,
        nodeProjectId,
        name: job.data.name,
        repoPath: job.data.targetPath,
        packageJsonFolderPath,
      } as NodeProjectAnalysisJobData;

      const project = new NodeProjectEntity();
      project.id = nodeProjectId;
      project.localPath = packageJsonFolderPath;
      await this.nodeProjectService.save(project);

      try {
        await this.nodeProjectAnalysisQueue.add(data);
      } catch (error) {
        this.logger.error(
          `Failed to queue node-project-analysis job for path ${packageJsonFolderPath}`,
          { data, error },
        );
      }
    }
  }
}
