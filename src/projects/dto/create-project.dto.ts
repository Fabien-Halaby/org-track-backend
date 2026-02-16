import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty({ example: 'Projet Insertion Jeunes 2024' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Accompagnement de 50 jeunes vers l emploi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({ example: '2026-02-15', description: 'Doit être aujourd\'hui ou dans le futur' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-15', description: 'Doit être après la date de début' })
  @IsOptional()
  @IsDateString()
  @ValidateIf(o => o.startDate !== undefined)
  endDate?: string;

  @ApiPropertyOptional({ example: 'uuid-du-manager' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}