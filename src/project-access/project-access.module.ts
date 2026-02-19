import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectAccessService } from './project-access.service';
import { ProjectAccessController } from './project-access.controller';
import { ProjectAccess } from './entities/project-access.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectAccess])],
  controllers: [ProjectAccessController],
  providers: [ProjectAccessService],
  exports: [ProjectAccessService],
})
export class ProjectAccessModule {}
