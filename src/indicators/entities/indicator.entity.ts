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
import { Project } from '../../projects/entities/project.entity';

export type IndicatorType = 'number' | 'percentage' | 'currency' | 'boolean';

@Entity('indicators')
export class Indicator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['number', 'percentage', 'currency', 'boolean'],
  })
  type: IndicatorType;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  targetValue: number | null;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, (project) => project.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => IndicatorValue, (value) => value.indicator, {
    cascade: true,
  })
  values: IndicatorValue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('indicator_values')
export class IndicatorValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value: number;

  @Column()
  period: string; //! YYYY-MM ou YYYY-Q1, YYYY-Q2...

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column()
  indicatorId: string;

  @ManyToOne(() => Indicator, (indicator) => indicator.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'indicatorId' })
  indicator: Indicator;

  @CreateDateColumn()
  createdAt: Date;
}
