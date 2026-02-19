import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('project_access')
@Unique(['userId', 'projectId'])
export class ProjectAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.projectAccess)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'simple-json' })
  permissions: string[];

  @Column()
  grantedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'grantedById' })
  grantedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
