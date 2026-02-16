import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsEnum, IsOptional, ValidateIf, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ 
    enum: ['draft', 'active', 'completed', 'cancelled'],
    description: 'Transitions: draft→active→completed | draft/active→cancelled'
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Date de début (pour activation manuelle)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (pour clôture)' })
  @IsOptional()
  @IsDateString()
  @ValidateIf(o => o.startDate !== undefined)
  endDate?: string;

  @ApiPropertyOptional({ description: 'ID du manager' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}