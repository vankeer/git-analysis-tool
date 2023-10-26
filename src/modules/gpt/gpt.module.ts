import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { GptService } from './gpt.service';
import { GptController } from './gpt.controller';
import { LoggerModule } from '../logger/logger.module';

@Module({
  providers: [GptService],
  controllers: [GptController],
  imports: [ConfigModule, HttpModule, LoggerModule],
})
export class GptModule {}
