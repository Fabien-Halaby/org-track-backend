import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectsScheduler } from './projects.scheduler';
import { Project } from './entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ScheduleModule.forRoot(), // Activer le scheduler
  ],
  providers: [ProjectsService, ProjectsScheduler],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}