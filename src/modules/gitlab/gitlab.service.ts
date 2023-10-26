import * as Resources from '@gitbeaker/core';
import { Gitlab } from '@gitbeaker/rest';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GitlabProjectEntity } from './entities/gitlab-project.entity';
import { Repository } from 'typeorm';
import { LoggerService } from '../logger/logger.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

const IGNORE_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MiB

@Injectable()
export class GitlabService {
  private gitlab: Resources.Gitlab;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly logger: LoggerService,
    @InjectRepository(GitlabProjectEntity)
    private readonly gitlabProjectRepository: Repository<GitlabProjectEntity>,
    @InjectQueue('gitlab') private readonly gitlabQueue: Queue,
  ) {
    logger.setContext(GitlabService.name);

    const token = config.get('GITLAB_TOKEN');
    const host = config.get('GITLAB_URL');
    logger.verbose(`Instantiating GitlabService with host: ${host}`);
    this.gitlab = new Gitlab({
      host,
      token,
      rejectUnauthorized: false,
    });
  }

  getById(id: number): Promise<GitlabProjectEntity | null> {
    return this.gitlabProjectRepository.findOneBy({ id });
  }

  getAllCached(): Promise<GitlabProjectEntity[]> {
    return this.gitlabProjectRepository.find();
  }

  fetchAllProjects() {
    this.gitlabQueue.add('fetchAll', {
      // maxPages: 1,
      perPage: 80,
      // startPage: 886,
      startPage: 1,
    });
  }

  async getProjects(
    page: number,
    perPage = 80,
    maxPages?: number,
  ): Promise<{
    projects: Resources.ProjectSchema[];
    paginationInfo: Resources.OffsetPagination;
  }> {
    this.logger.log(`Getting projects page ${page}`);

    const { data: projects, paginationInfo } = await this.gitlab.Projects.all({
      pagination: 'offset',
      page,
      maxPages,
      perPage,
      showExpanded: true,
      statistics: false,
    });

    this.logger.verbose(
      `Got projects (page  ${paginationInfo.current} / ${paginationInfo.totalPages})`,
    );

    return { projects, paginationInfo };
  }

  async saveProject(project: Resources.ProjectSchema): Promise<number> {
    const gitlabProject = new GitlabProjectEntity();
    gitlabProject.id = project.id;
    gitlabProject.branch = project.default_branch || 'master';

    if (project.empty_repo) {
      gitlabProject.ignore = true;
    }

    if (project.archived) {
      gitlabProject.ignore = true;
    }

    if (project.namespace?.kind === 'user') {
      gitlabProject.ignore = true;
    }

    if (project.forked_from_project) {
      gitlabProject.ignore = true;
    }

    if (!gitlabProject.ignore) {
      // check if this project is already indexed
      const existingProject = await this.gitlabProjectRepository.findOneBy({
        id: project.id,
      });
      if (existingProject) {
        if (!existingProject.ignore) {
          if (
            project.last_activity_at !==
            existingProject.project?.last_activity_at
          ) {
            this.logger.verbose(
              `Project ${project.id} is already indexed, but is outdated.`,
            );
            gitlabProject.outdated = true;
          } else {
            this.logger.verbose(
              `Project ${project.id} is already indexed and up to date.`,
            );
            gitlabProject.outdated = false;
          }
        } else {
          this.logger.verbose(`Database said to ignore project ${project.id}`);
          project.ignore = existingProject.ignore;
        }
      } else {
        gitlabProject.outdated = false;
        this.logger.verbose(`Project ${project.id} is new.`);
      }
    }

    gitlabProject.project = project;
    await this.gitlabProjectRepository.save(gitlabProject);

    return gitlabProject.id;
  }

  // TODO use return value interface?
  async markAsDownloaded(
    id: number,
    localPath: string,
    bytes: number,
    ccCompliance: number,
    packageJsonFolderPaths: string[],
  ): Promise<GitlabProjectEntity> {
    const project = await this.gitlabProjectRepository.findOneBy({ id });
    project.localPath = localPath;
    project.bytes = bytes;
    project.ccCompliance = ccCompliance;
    project.packageJsonFolderPaths = packageJsonFolderPaths;
    if (bytes > IGNORE_SIZE_LIMIT) {
      this.logger.verbose(`Project ${id} is over the size limit, ignoring...`);
      project.ignore = true;
    }
    await this.gitlabProjectRepository.save(project);
    return project;
  }
}
