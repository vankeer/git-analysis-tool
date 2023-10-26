import {
  OnGlobalQueueError,
  OnQueueCompleted,
  OnQueueError,
  OnQueueFailed,
  Processor,
} from '@nestjs/bull';
import { Job } from 'bull';
import {
  NodeProjectAnalysisJobData,
  NodeProjectAnalysisJobReturnValue,
} from 'src/models/jobs/NodeProjectAnalysisJobData';
import { GraphService } from 'src/modules/graph/graph.service';
import { LoggerService } from 'src/modules/logger/logger.service';
import { NodeProjectEntity } from 'src/modules/project/entities/node-project.entity';

@Processor('node-project-analysis')
export class NodeProjectAnalysisProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly graphService: GraphService,
  ) {
    logger.setContext(NodeProjectAnalysisProcessor.name);
    logger.debug('Registered');
  }

  @OnQueueError()
  onQueueError(job: Job, error: Error) {
    this.logger.error(
      `Error processing node project`,
      JSON.stringify({
        error,
        data: job.data,
      }),
    );
  }

  @OnQueueFailed()
  onQueueFailed(job: Job, error: Error) {
    this.logger.error(
      `Failed to process node project`,
      JSON.stringify({
        error,
        data: job.data,
      }),
    );
  }

  @OnGlobalQueueError()
  onGlobalQueueError() {
    this.logger.error(`Global queue error`);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<NodeProjectAnalysisJobData>) {
    this.logger.verbose(`Completed Node project analysis of ${job.data.name}`);

    const {
      id,
      nodeProjectId,
      authorData,
      directorySize,
      complexity,
      hasNodeModules,
      locStats,
      packageJson,
      projectTypes,
      srcFolder,
      angularComponents,
    } = job.returnvalue as NodeProjectAnalysisJobReturnValue;

    // create the Node project for this package.json
    await this.graphService.createNodeProjectNode(job.returnvalue);

    const updates: Partial<NodeProjectEntity> = {};

    // create the Authors
    for (const a of authorData || []) {
      await this.graphService.createAuthorData(id, a);
    }

    // create dependencies for this package
    if (packageJson) {
      updates.packageJson = packageJson;

      if (packageJson.dependencies) {
        await this.graphService.createDependencies(
          nodeProjectId,
          'Dependency',
          packageJson.dependencies,
        );
      }
      if (packageJson.devDependencies) {
        await this.graphService.createDependencies(
          nodeProjectId,
          'DevDependency',
          packageJson.devDependencies,
        );
      }
      if (packageJson.peerDependencies) {
        await this.graphService.createDependencies(
          nodeProjectId,
          'PeerDependency',
          packageJson.peerDependencies,
        );
      }
    }

    if (locStats) {
      await this.graphService.updateNodeProjectStats(nodeProjectId, locStats);
    }

    if (complexity) {
      updates.cognitiveComplexity = complexity.cognitiveComplexity;
      updates.cyclomaticComplexity = complexity.cyclomaticComplexity;
    }

    if (angularComponents?.length) {
      updates.angularComponents = angularComponents.length;
      await this.graphService.createAngularComponents(
        nodeProjectId,
        angularComponents,
      );
    }

    this.logger.verbose(
      `All done processing node project @ ${job.data.packageJsonFolderPath}`,
    );
  }
}
