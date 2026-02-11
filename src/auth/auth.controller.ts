import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte + organisation' })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 400, description: 'Email déjà utilisé' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion' })
  @ApiResponse({ status: 200, description: 'Connecté' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}