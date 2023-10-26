import {
  InjectQueue,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { FetchAllGitlabProjectsJobData } from 'src/models/jobs/FetchAllGitlabProjectsJobData';
import { GitJobData } from 'src/models/jobs/GitJobData';
import { GitlabService } from 'src/modules/gitlab/gitlab.service';
import { LoggerService } from 'src/modules/logger/logger.service';

const DEFAULT_TIMEOUT_BETWEEN_API_CALLS = 1000;

@Processor('gitlab')
export class GitlabProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly gitlabService: GitlabService,
    @InjectQueue('git') private readonly gitQueue: Queue,
  ) {
    logger.setContext(GitlabProcessor.name);
  }

  @Process('fetchAll')
  async fetchAll(job: Job<FetchAllGitlabProjectsJobData>) {
    const { timeout, startPage, perPage, maxPages, fetchOnly } = job.data;
    this.logger.log(`Fetching all projects`, job.data);

    let page = startPage || 1;

    try {
      let totalPages = maxPages;
      do {
        this.logger.verbose(`Getting ${perPage} projects for page ${page}`);

        const { paginationInfo, projects } =
          await this.gitlabService.getProjects(page, perPage || 80);

        totalPages = paginationInfo.totalPages;

        this.logger.verbose(`Saving ${projects?.length} projects`);

        for (const project of projects) {
          await this.gitlabService.saveProject(project);
          if (!project.ignore && !fetchOnly) {
            this.logger.verbose(
              `Adding to git queue: ${project.name_with_namespace}`,
            );
            this.gitQueue.add({
              repoUrl: project.ssh_url_to_repo,
              branch: project.default_branch,
              id: project.id,
              name: project.name_with_namespace,
            } as GitJobData);
          }
        }

        page = paginationInfo.next;
        this.logger.verbose(`Now page ${page} of ${totalPages}`);
      } while (!!page && page < totalPages);
    } catch (error) {
      this.logger.error(
        `Failed to fetch all projects`,
        JSON.stringify({
          error,
          message: error.message,
          data: job.data,
        }),
      );
    }

    if (timeout) {
      await new Promise((resolve) =>
        setTimeout(resolve, timeout || DEFAULT_TIMEOUT_BETWEEN_API_CALLS),
      );
    }
  }

  @OnQueueCompleted()
  onCompleted(_job: Job<FetchAllGitlabProjectsJobData>) {
    this.logger.log('Processing of gitlab job completed');
  }
}
