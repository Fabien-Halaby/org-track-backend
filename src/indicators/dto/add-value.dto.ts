// import { IsNumber, IsString, IsOptional } from 'class-validator';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// export class AddValueDto {
//   @ApiProperty({ example: 42 })
//   @IsNumber()
//   value: number;

//   @ApiProperty({ example: '2024-01', description: 'YYYY-MM ou YYYY-Q1' })
//   @IsString()
//   period: string;

//   @ApiPropertyOptional({ example: 'Données provisoires' })
//   @IsOptional()
//   @IsString()
//   notes?: string;
// }

import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddValueDto {
  @ApiProperty({ example: 42, description: 'Valeur saisie' })
  @IsNumber()
  value: number;

  @ApiProperty({
    example: '2026-02',
    description:
      'Période selon fréquence: YYYY-MM-DD (daily), YYYY-WXX (weekly), YYYY-MM (monthly), YYYY-QX (quarterly), YYYY (yearly)',
  })
  @IsString()
  period: string;

  @ApiPropertyOptional({ example: 'Commentaire sur cette valeur' })
  @IsOptional()
  @IsString()
  notes?: string;
}
