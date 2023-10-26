import { Module } from '@nestjs/common';
import { GitService } from './git.service';
import { LoggerModule } from '../logger/logger.module';
import { GitController } from './git.controller';

@Module({
  providers: [GitService],
  imports: [LoggerModule],
  exports: [GitService],
  controllers: [GitController],
})
export class GitModule {}
