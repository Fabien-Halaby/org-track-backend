import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Project } from '../projects/entities/project.entity';
import { Indicator, IndicatorValue } from '../indicators/entities/indicator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Indicator, IndicatorValue]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}