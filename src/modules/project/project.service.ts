import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerService } from '../logger/logger.service';
import { NodeProjectEntity } from './entities/node-project.entity';

@Injectable()
export class ProjectService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(NodeProjectEntity)
    private readonly nodeProjectRepository: Repository<NodeProjectEntity>,
  ) {
    logger.setContext(ProjectService.name);
  }

  getAllCached(): Promise<NodeProjectEntity[]> {
    return this.nodeProjectRepository.find();
  }

  getById(id: string): Promise<NodeProjectEntity | null> {
    return this.nodeProjectRepository.findOneBy({ id });
  }

  save(project: NodeProjectEntity) {
    return this.nodeProjectRepository.save(project);
  }

  update(nodeProjectId: string, data: Partial<NodeProjectEntity>) {
    return this.nodeProjectRepository.update(nodeProjectId, data);
  }
}
