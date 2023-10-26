import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
