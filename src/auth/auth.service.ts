import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { InvitationsService } from '../invitations/invitations.service';
import { LoginDto, RegisterDto } from './dto';
import { JoinDto } from '../invitations/dto/join.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private orgsService: OrganizationsService,
    private jwtService: JwtService,
    private config: ConfigService,
    private invitationsService: InvitationsService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
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
      role: 'admin' as UserRole,
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

  async registerFromInvitation(dto: JoinDto) {
    const verification = await this.invitationsService.verifyToken(dto.token);

    const invitation = await this.invitationsService['invitationRepo'].findOne({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new BadRequestException('Invitation non trouvée');
    }

    if (invitation.email && invitation.email !== dto.email) {
      throw new BadRequestException(
        'Cette invitation est destinée à un autre email',
      );
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: verification.invitation.role,
      organizationId: verification.invitation.orgId,
      invitedBy: { id: invitation.invitedById ?? '' } as User,
    });

    await this.invitationsService.consumeToken(dto.token, user.id);

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async generateTokens(user: User) {
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

  private sanitizeUser(user: User) {
    const { password, refreshToken, ...result } = user;
    console.log(refreshToken, password);
    return result;
  }
}
