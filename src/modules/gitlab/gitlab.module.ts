import { Module } from '@nestjs/common';
import { GitlabService } from './gitlab.service';
import { HttpModule } from '@nestjs/axios';
import { GitlabController } from './gitlab.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitlabProjectEntity } from './entities/gitlab-project.entity';
import { LoggerModule } from '../logger/logger.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    LoggerModule,
    HttpModule,
    TypeOrmModule.forFeature([GitlabProjectEntity]),
    BullModule.registerQueue({
      name: 'gitlab',
    }),
    BullModule.registerQueue({
      name: 'git',
    }),
    BullModule.registerQueue({
      name: 'node-project-analysis',
    }),
  ],
  providers: [GitlabService],
  controllers: [GitlabController],
  exports: [GitlabService],
})
export class GitlabModule {}
