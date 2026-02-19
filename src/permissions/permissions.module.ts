import { Module } from '@nestjs/common';
import { ProjectAccessModule } from '../project-access/project-access.module';

@Module({
  imports: [ProjectAccessModule],
  providers: [],
  exports: [],
})
export class PermissionsModule {}
