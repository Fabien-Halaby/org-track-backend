import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIndicatorDto {
  @ApiProperty({ example: 'Nombre de jeunes accompagnés' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Nombre total de bénéficiaires du programme',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['number', 'percentage', 'currency', 'boolean'] })
  @IsEnum(['number', 'percentage', 'currency', 'boolean'])
  type: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiProperty({ example: 'uuid-du-projet' })
  @IsUUID()
  projectId: string;
}
