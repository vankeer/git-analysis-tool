import { Controller, Get, Param } from '@nestjs/common';
import { GptService } from './gpt.service';

@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Get('cypher/:query')
  getCypherQuery(@Param('query') query: string) {
    return this.gptService.translateToCypher(query);
  }
}
