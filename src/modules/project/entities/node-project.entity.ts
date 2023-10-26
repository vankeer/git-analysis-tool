import { ProjectSchema } from '@gitbeaker/core';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('NodeProject')
export class NodeProjectEntity {
  @PrimaryColumn()
  id: string;

  @Column({ default: false })
  ignore: boolean;

  @Column({ default: false })
  outdated: boolean;

  @Column({ nullable: true })
  bytes?: number;

  @Column({ nullable: true })
  localPath?: string;

  @Column({ type: 'json', nullable: true })
  packageJson?: Record<string, any>;

  @Column({ nullable: true })
  ccCompliance?: number;

  @Column({ nullable: true })
  files?: number;

  @Column({ nullable: true })
  methods?: number;

  @Column({ nullable: true })
  linesOfCode?: number;

  @Column({ nullable: true })
  cognitiveComplexity?: number;

  @Column({ nullable: true })
  cyclomaticComplexity?: number;

  @Column({ nullable: true })
  angularComponents?: number;
}
