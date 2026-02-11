import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private orgsService: OrganizationsService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    const org = await this.orgsService.create({
      name: dto.organizationName,
      description: dto.organizationDescription,
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'admin',
      organizationId: org.id,
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      organization: org,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens(user);
    
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async generateTokens(user: any) {
    const payload = { 
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { password, refreshToken, ...result } = user;
    return result;
  }
}