import { InjectQueue, OnQueueCompleted, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { GitAnalysisJobData } from 'src/models/jobs/GitAnalysisJobData';
import { GitJobData } from 'src/models/jobs/GitJobData';
import { LoggerService } from 'src/modules/logger/logger.service';

@Processor('git')
export class GitProcessor {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue('git-analysis') private readonly gitAnalysisQueue: Queue,
  ) {
    logger.setContext(GitProcessor.name);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<GitJobData>) {
    this.logger.verbose(`Completed git sync of ${job.data.name}`);

    const returnvalue = job.returnvalue as GitAnalysisJobData;
    this.gitAnalysisQueue.add(returnvalue);
  }
}
