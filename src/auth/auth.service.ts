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
    const users = await this.userRepo.find({
      where: { email: dto.email },
      relations: ['organization'],
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const validUsers: User[] = [];
    for (const user of users) {
      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (isMatch) validUsers.push(user);
    }

    if (validUsers.length === 0) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (validUsers.length > 1) {
      return {
        multipleAccounts: true,
        accounts: validUsers.map((u) => ({
          userId: u.id,
          organizationId: u.organizationId,
          organizationName: u.organization.name,
          role: u.role,
        })),
      };
    }

    const user = validUsers[0];
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      organization: user.organization,
      ...tokens,
    };
  }

  async selectAccount(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Compte introuvable');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      organization: user.organization,
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

    const existingInOrg = await this.userRepo.findOne({
      where: {
        email: dto.email,
        organizationId: verification.invitation.orgId,
      },
    });

    if (existingInOrg) {
      throw new BadRequestException(
        'Vous êtes déjà membre de cette organisation',
      );
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
      organization: {
        id: verification.invitation.orgId,
        name: verification.invitation.organizationName,
      },
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
      expiresIn: '1h',
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

  async joinExistingUser(
    token: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) {
    const verification = await this.invitationsService.verifyToken(token);

    const invitation = await this.invitationsService['invitationRepo'].findOne({
      where: { token },
    });

    if (!invitation) {
      throw new BadRequestException('Invitation non trouvée');
    }

    if (invitation.email && invitation.email !== email) {
      throw new BadRequestException(
        'Cette invitation est destinée à un autre email',
      );
    }

    const alreadyMember = await this.userRepo.findOne({
      where: { email, organizationId: verification.invitation.orgId },
    });

    if (alreadyMember) {
      throw new BadRequestException(
        'Vous êtes déjà membre de cette organisation',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: verification.invitation.role,
      organizationId: verification.invitation.orgId,
      invitedBy: { id: invitation.invitedById ?? '' } as User,
    });

    await this.invitationsService.consumeToken(token, newUser.id);

    const tokens = await this.generateTokens(newUser);

    return {
      user: this.sanitizeUser(newUser),
      organization: {
        id: verification.invitation.orgId,
        name: verification.invitation.organizationName,
      },
      ...tokens,
    };
  }

  async checkEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return { exists: false };
    return {
      exists: true,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
