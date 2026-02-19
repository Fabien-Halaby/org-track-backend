import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import type { AccessRole } from '../entities/project-access.entity';

export class CreateProjectAccessDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  projectId?: string | null;

  @IsString()
  organizationId: string;

  @IsEnum(['admin', 'manager', 'agent', 'observer'])
  @IsOptional()
  role?: AccessRole;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsString()
  grantedById: string;
}
