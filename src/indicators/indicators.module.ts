import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndicatorsService } from './indicators.service';
import { IndicatorsController } from './indicators.controller';
import { Indicator, IndicatorValue } from './entities/indicator.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Indicator, IndicatorValue]),
    ProjectsModule,
  ],
  providers: [IndicatorsService],
  controllers: [IndicatorsController],
  exports: [IndicatorsService],
})
export class IndicatorsModule {}
