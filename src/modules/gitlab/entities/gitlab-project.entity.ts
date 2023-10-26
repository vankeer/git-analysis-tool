import { ProjectSchema } from '@gitbeaker/core';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('GitlabProject')
export class GitlabProjectEntity {
  @PrimaryColumn()
  id: number;

  @Column({ default: false })
  ignore: boolean;

  @Column({ default: false })
  outdated: boolean;

  @Column({ nullable: true })
  bytes?: number;

  @Column({ nullable: true })
  localPath?: string;

  @Column()
  branch: string;

  @Column({ type: 'json' })
  project: ProjectSchema;

  @Column({ nullable: true })
  ccCompliance?: number;

  @Column({
    nullable: true,
    type: 'text',
    transformer: {
      // unmarshal data from sqlite db
      from(val: string | null | undefined) {
        return val ? JSON.parse(val) : [];
      },
      // marshal data into sqlite db
      to(val: object | null | undefined) {
        return val ? JSON.stringify(val) : '[]';
      },
    },
  })
  packageJsonFolderPaths?: string[];
}
