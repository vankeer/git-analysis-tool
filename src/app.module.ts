import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import path, { join } from 'path';

import { AppController } from './app.controller';
import { GraphModule } from './modules/graph/graph.module';
import { GitlabModule } from './modules/gitlab/gitlab.module';
import { LoggerModule } from './modules/logger/logger.module';
import { GitModule } from './modules/git/git.module';
import { ProcessorModule } from './processor/processor.module';
import { ProjectModule } from './modules/project/project.module';
import { GptModule } from './modules/gpt/gpt.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphModule,
    GitlabModule,
    LoggerModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: `${process.env.SQLITE_DB_PATH}`,
      entities: [path.join(__dirname, '**', '*.entity{.ts,.js}')],
      synchronize: true,
    }),
    GitModule,
    ProcessorModule,
    ProjectModule,
    GptModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
