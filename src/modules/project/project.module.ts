import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectController } from './project.controller';
import { LoggerModule } from '../logger/logger.module';
import { GraphModule } from '../graph/graph.module';
import { ProjectService } from './project.service';
import { NodeProjectEntity } from './entities/node-project.entity';

@Module({
  controllers: [ProjectController],
  imports: [
    GraphModule,
    LoggerModule,
    TypeOrmModule.forFeature([NodeProjectEntity]),
  ],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
