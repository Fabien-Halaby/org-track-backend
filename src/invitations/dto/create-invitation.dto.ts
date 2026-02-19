import {
    IsEnum,
    IsOptional,
    IsArray,
    IsString,
    IsInt,
    Min,
    Max
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ enum: ['admin', 'manager', 'agent', 'observer'] })
  @IsEnum(['admin', 'manager', 'agent', 'observer'])
  role: 'admin' | 'manager' | 'agent' | 'observer';

  @ApiPropertyOptional({
    description: 'IDs des projets (null = tous pour observer/admin)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @ApiPropertyOptional({ description: 'Permissions spécifiques (null = défaut par rôle)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Email pré-rempli (optionnel)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Jours avant expiration', default: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number = 7;
}