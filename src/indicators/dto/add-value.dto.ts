import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddValueDto {
  @ApiProperty({ example: 42 })
  @IsNumber()
  value: number;

  @ApiProperty({ example: '2024-01', description: 'YYYY-MM ou YYYY-Q1' })
  @IsString()
  period: string;

  @ApiPropertyOptional({ example: 'Données provisoires' })
  @IsOptional()
  @IsString()
  notes?: string;
}
