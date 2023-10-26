import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { LoggerService } from '../logger/logger.service';

@Injectable()
export class GptService {
  private readonly graphqlSchema: string;
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
  ) {
    logger.setContext(GptService.name);

    // Load GraphQL schema
    const schemaPath = join(__dirname, '..', '..', 'assets', 'schema.graphql');
    this.graphqlSchema = readFileSync(schemaPath, 'utf-8');
    if (this.graphqlSchema.length === 0) {
      throw new Error('Failed to read GraphQL schema of the Neo4J db!');
    }

    const apiKey = this.configService.get('OPENAI_API_KEY');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async translateToCypher(question: string): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('Missing OpenAI API key!');
    }

    const prompt = `Given the following GraphQL schema of a Neo4j database:

\`\`\`
${this.graphqlSchema}
\`\`\`

Translate the question: "${question}" into a Cypher query. Only reply with the Cypher query - no further explanation!`;

    const chatCompletion = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4',
    });

    return chatCompletion.choices[0].message.content;
  }
}
