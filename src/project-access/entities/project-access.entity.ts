import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export type AccessRole = 'admin' | 'manager' | 'agent' | 'observer';

@Entity('project_access')
@Index(['userId', 'organizationId', 'projectId'])
export class ProjectAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.projectAccess)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true, type: 'uuid' })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'agent', 'observer'],
    default: 'agent',
  })
  role: AccessRole;

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
