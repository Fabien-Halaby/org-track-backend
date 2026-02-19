import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export type InvitationRole = 'admin' | 'manager' | 'agent' | 'observer';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  token: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'agent', 'observer'],
  })
  role: InvitationRole;

  @Column({ type: 'simple-json', nullable: true })
  projectIds: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  permissions: string[] | null;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  invitedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ default: false })
  used: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
