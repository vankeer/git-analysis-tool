import { Module } from '@nestjs/common';
import { GitProcessor } from './git.processor';
import { LoggerModule } from 'src/modules/logger/logger.module';
import { GitlabProcessor } from './gitlab.processor';
import { GitlabModule } from 'src/modules/gitlab/gitlab.module';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import { GitAnalysisProcessor } from './git-analysis.processor';
import { NodeProjectAnalysisProcessor } from './node-project-analysis.processor';
import { GraphModule } from 'src/modules/graph/graph.module';
import { ProjectModule } from 'src/modules/project/project.module';

@Module({
  imports: [
    LoggerModule,
    GitlabModule,
    ProjectModule,
    BullModule.registerQueue({
      name: 'gitlab',
    }),
    BullModule.registerQueue({
      name: 'git',
      processors: [join(__dirname, 'process', 'git.js')],
    }),
    BullModule.registerQueue({
      name: 'git-analysis',
      processors: [join(__dirname, 'process', 'git-analysis.js')],
    }),
    BullModule.registerQueue({
      name: 'node-project-analysis',
      processors: [join(__dirname, 'process', 'node-project-analysis.js')],
    }),
    GraphModule,
  ],
  providers: [
    GitProcessor,
    GitlabProcessor,
    GitAnalysisProcessor,
    NodeProjectAnalysisProcessor,
  ],
})
export class ProcessorModule {}
