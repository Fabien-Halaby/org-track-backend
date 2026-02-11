import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}