import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Marie' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'marie@exemple.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Association Impact Jeunesse' })
  @IsString()
  organizationName: string;

  @ApiPropertyOptional({ example: 'Aide à l\'insertion professionnelle' })
  @IsOptional()
  @IsString()
  organizationDescription?: string;
}