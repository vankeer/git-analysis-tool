import { Controller, Get } from '@nestjs/common';

import { LoggerService } from './modules/logger/logger.service';

@Controller()
export class AppController {
  constructor(private readonly logger: LoggerService) {
    logger.setContext(AppController.name);
  }

  @Get()
  getRoot(): string {
    return 'Hello World!';
  }
}
