import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectAccessService } from './project-access.service';
import { ProjectAccess } from './entities/project-access.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectAccess])],
  providers: [ProjectAccessService],
  exports: [ProjectAccessService],
})
export class ProjectAccessModule {}
