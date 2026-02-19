import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProjectAccess } from '../../project-access/entities/project-access.entity';

export type UserRole = 'admin' | 'manager' | 'agent' | 'observer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'agent', 'observer'],
    default: 'agent',
  })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User | null;

  @OneToMany(() => ProjectAccess, (access) => access.user)
  projectAccess: ProjectAccess[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
