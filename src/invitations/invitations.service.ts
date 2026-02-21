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

    const tempInvitation = this.invitationRepo.create({
      role: dto.role,
      projectIds: dto.projectIds || null,
      permissions: dto.permissions || this.getDefaultPermissions(dto.role),
      organizationId: organizationId,
      invitedById,
      email: dto.email || null,
      expiresAt,
      used: false,
      token: 'temp',
    });

    const saved = await this.invitationRepo.save(tempInvitation);

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
      console.error("Erreur de vérification du token d'invitation:", error);
      throw new BadRequestException('Token invalide ou expiré');
    }
  }

  async consumeToken(token: string, userId: string) {
    console.log('=== CONSUME TOKEN START ===');
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('UserId:', userId);

    const payload = this.jwtService.verify<InvitationTokenPayload>(token, {
      secret:
        this.config.get('INVITATION_SECRET') || this.config.get('JWT_SECRET'),
    });
    console.log('Payload:', payload);

    const invitation = await this.invitationRepo.findOne({
      where: { id: payload.invId },
    });
    console.log('Invitation found:', invitation);

    if (!invitation || invitation.used) {
      console.log('ERROR: Invitation already used or not found');
      throw new BadRequestException('Invitation déjà utilisée');
    }

    const orgId = invitation.organizationId || payload.orgId;
    console.log(
      'OrgId:',
      orgId,
      '(from invitation:',
      invitation.organizationId,
      'or payload:',
      payload.orgId,
      ')',
    );

    if (!orgId) {
      console.log('ERROR: No orgId!');
      throw new BadRequestException('Organization ID manquant');
    }

    invitation.used = true;
    await this.invitationRepo.save(invitation);
    console.log('Invitation marked as used');

    const defaultPermissions = this.getDefaultPermissions(payload.role);
    console.log('Default permissions:', defaultPermissions);

    // Vérifier si existe déjà
    const existing = await this.projectAccessService.findByUserAndOrg(
      userId,
      orgId,
    );
    console.log('Existing access:', existing);

    if (!existing) {
      console.log('Creating project access...');
      try {
        const created = await this.projectAccessService.create({
          userId,
          projectId: null,
          organizationId: orgId,
          role: payload.role,
          permissions: defaultPermissions,
          grantedById: invitation.invitedById,
        });
        console.log('Project access created:', created);
      } catch (err) {
        console.log('ERROR creating project access:', err);
        throw err;
      }
    } else {
      console.log('Project access already exists, skipping');
    }

    console.log('=== CONSUME TOKEN END ===');
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
