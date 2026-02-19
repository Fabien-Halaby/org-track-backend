import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Invitation, InvitationRole } from './entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ProjectAccessService } from '../project-access/project-access.service';

interface InvitationTokenPayload {
  invId: string;
  role: InvitationRole;
  orgId: string;
  projects: string[] | null;
  permissions: string[] | null;
  iat: number;
  exp: number;
}

export interface VerificationResult {
  valid: boolean;
  invitation: {
    role: InvitationRole;
    orgId: string;
    organizationName: string;
    invitedBy: string;
    email: string | null;
  };
}

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepo: Repository<Invitation>,
    private jwtService: JwtService,
    private config: ConfigService,
    private projectAccessService: ProjectAccessService,
  ) {}

  async create(
    dto: CreateInvitationDto,
    invitedById: string,
    organizationId: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expiresInDays || 7));

    console.log('DEBUG - organizationId reçu:', organizationId);

    const tempInvitation = this.invitationRepo.create({
      role: dto.role,
      projectIds: dto.projectIds || null,
      permissions: dto.permissions || this.getDefaultPermissions(dto.role),
      organizationId: organizationId, // ← AJOUTÉ ICI
      invitedById,
      email: dto.email || null,
      expiresAt,
      used: false,
      token: 'temp',
    });

    const saved = await this.invitationRepo.save(tempInvitation);

    // Générer le JWT avec l'ID de l'invitation
    const token = this.jwtService.sign(
      {
        invId: saved.id,
        role: dto.role,
        orgId: organizationId,
        projects: dto.projectIds || null,
        permissions: dto.permissions || this.getDefaultPermissions(dto.role),
      },
      {
        secret:
          this.config.get('INVITATION_SECRET') || this.config.get('JWT_SECRET'),
        expiresIn: `${dto.expiresInDays || 7}d`,
      },
    );

    // Mettre à jour avec le vrai token
    saved.token = token;
    await this.invitationRepo.save(saved);

    return {
      invitation: saved,
      link: `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/join?token=${token}`,
    };
  }

  async verifyToken(token: string): Promise<VerificationResult> {
    try {
      const payload = this.jwtService.verify<InvitationTokenPayload>(token, {
        secret:
          this.config.get('INVITATION_SECRET') || this.config.get('JWT_SECRET'),
      });

      const invitation = await this.invitationRepo.findOne({
        where: {
          id: payload.invId,
          used: false,
          expiresAt: MoreThan(new Date()),
        },
        relations: ['organization', 'invitedBy'],
      });

      if (!invitation) {
        throw new BadRequestException('Invitation invalide ou expirée');
      }

      return {
        valid: true,
        invitation: {
          role: payload.role,
          orgId: payload.orgId,
          organizationName: invitation.organization.name,
          invitedBy: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
          email: invitation.email,
        },
      };
    } catch (error) {
      console.log('Error verifying invitation token:', error);
      throw new BadRequestException('Token invalide ou expiré');
    }
  }

  async consumeToken(token: string, userId: string) {
    const payload = this.jwtService.verify<InvitationTokenPayload>(token, {
      secret:
        this.config.get('INVITATION_SECRET') || this.config.get('JWT_SECRET'),
    });

    const invitation = await this.invitationRepo.findOne({
      where: { id: payload.invId },
    });

    if (!invitation || invitation.used) {
      throw new BadRequestException('Invitation déjà utilisée');
    }

    invitation.used = true;
    await this.invitationRepo.save(invitation);

    const defaultPermissions = this.getDefaultPermissions(payload.role);

    await this.projectAccessService.create({
      userId,
      projectId: null,
      organizationId: payload.orgId,
      role: payload.role,
      permissions: defaultPermissions,
      grantedById: invitation.invitedById,
    });

    if (payload.projects && payload.projects.length > 0) {
      for (const projectId of payload.projects) {
        await this.projectAccessService.create({
          userId,
          projectId,
          organizationId: payload.orgId,
          role: payload.role,
          permissions: payload.permissions || defaultPermissions,
          grantedById: invitation.invitedById,
        });
      }
    }

    return invitation;
  }

  async findByOrganization(orgId: string) {
    return this.invitationRepo.find({
      where: { organizationId: orgId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string, orgId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { id, organizationId: orgId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation non trouvée');
    }

    if (invitation.used) {
      throw new BadRequestException('Invitation déjà utilisée');
    }

    await this.invitationRepo.remove(invitation);
    return { success: true };
  }

  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'manage', 'admin'];
      case 'manager':
        return ['read', 'write', 'manage'];
      case 'agent':
        return ['read', 'write_indicator'];
      case 'observer':
        return ['read'];
      default:
        return ['read'];
    }
  }
}
