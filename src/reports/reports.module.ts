import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ProjectsModule } from '../projects/projects.module';
import { Indicator, IndicatorValue } from '../indicators/entities/indicator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Indicator, IndicatorValue]),
    ProjectsModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
