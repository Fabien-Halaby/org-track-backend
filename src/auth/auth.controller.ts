import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JoinDto } from '../invitations/dto/join.dto';

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
  @ApiResponse({ status: 200, description: 'Connecté ou liste de comptes' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('select-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Choisir un compte parmi plusieurs organisations' })
  async selectAccount(@Body() body: { userId: string }) {
    return this.authService.selectAccount(body.userId);
  }

  @Post('join')
  @ApiOperation({ summary: 'Rejoindre via invitation' })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  async join(@Body() dto: JoinDto) {
    return this.authService.registerFromInvitation(dto);
  }

  @Post('join-existing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejoindre avec un compte existant' })
  async joinExisting(
    @Body()
    body: {
      token: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    },
  ) {
    return this.authService.joinExistingUser(
      body.token,
      body.firstName,
      body.lastName,
      body.email,
      body.password,
    );
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier si un email existe déjà en base' })
  async checkEmail(@Body() body: { email: string }) {
    return this.authService.checkEmail(body.email);
  }
}
