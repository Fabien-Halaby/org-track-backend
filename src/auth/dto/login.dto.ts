import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'admin@example.org',
    description: 'Email de connexion' 
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ 
    example: 'password123!',
    description: 'Mot de passe (8 caractères min)' 
  })
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court' })
  password: string;
}