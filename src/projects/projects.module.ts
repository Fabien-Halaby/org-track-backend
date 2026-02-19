import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectsScheduler } from './projects.scheduler';
import { Project } from './entities/project.entity';
import { ProjectAccessModule } from 'src/project-access/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ScheduleModule.forRoot(),
    ProjectAccessModule,
  ],
  providers: [ProjectsService, ProjectsScheduler],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
