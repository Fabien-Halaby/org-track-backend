import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ProjectAccess, AccessRole } from './entities/project-access.entity';
import { CreateProjectAccessDto } from './dto/create-project-access.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectAccessService {
  constructor(
    @InjectRepository(ProjectAccess)
    private accessRepo: Repository<ProjectAccess>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateProjectAccessDto) {
    const existing = await this.accessRepo.findOne({
      where: {
        userId: dto.userId,
        organizationId: dto.organizationId,
        projectId: dto.projectId ?? IsNull(),
      },
    });

    if (existing) return existing;

    const access = this.accessRepo.create({
      userId: dto.userId,
      projectId: dto.projectId ?? null,
      organizationId: dto.organizationId,
      role: dto.role ?? 'agent',
      permissions: dto.permissions,
      grantedById: dto.grantedById,
    });

    return this.accessRepo.save(access);
  }

  async findByUserAndOrg(userId: string, organizationId: string) {
    return this.accessRepo.findOne({
      where: { userId, organizationId, projectId: IsNull() },
    });
  }

  async findByUserProject(userId: string, projectId: string) {
    return this.accessRepo.findOne({
      where: { userId, projectId },
    });
  }

  async findMembersWithProjects(organizationId: string) {
    const allAccesses = await this.accessRepo.find({
      where: { organizationId },
      relations: ['user', 'project'],
      order: { createdAt: 'DESC' },
    });

    const membersMap = new Map<string, any>();

    for (const access of allAccesses) {
      if (!access.user) continue;

      if (!membersMap.has(access.userId)) {
        membersMap.set(access.userId, {
          accessId: access.id,
          userId: access.userId,
          user: access.user,
          role: access.role,
          permissions: access.permissions,
          createdAt: access.createdAt,
          projects: [],
        });
      }

      if (access.projectId !== null && access.project) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        membersMap.get(access.userId).projects.push({
          id: access.project.id,
          name: access.project.name,
          status: access.project.status,
          accessId: access.id,
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Array.from(membersMap.values());
  }

  async assignProject(
    userId: string,
    projectId: string,
    organizationId: string,
    grantedById: string,
  ) {
    const member = await this.accessRepo.findOne({
      where: { userId, organizationId, projectId: IsNull() },
    });

    if (!member) {
      throw new NotFoundException('Membre non trouvé dans cette organisation');
    }

    const existing = await this.accessRepo.findOne({
      where: { userId, projectId, organizationId },
    });

    if (existing) {
      throw new BadRequestException('Ce membre est déjà assigné à ce projet');
    }

    const access = this.accessRepo.create({
      userId,
      projectId,
      organizationId,
      role: member.role,
      permissions: member.permissions,
      grantedById,
    });

    return this.accessRepo.save(access);
  }

  async revokeProject(accessId: string, organizationId: string) {
    const access = await this.accessRepo.findOne({
      where: { id: accessId, organizationId },
    });

    if (!access) throw new NotFoundException('Accès non trouvé');
    if (access.projectId === null) {
      throw new BadRequestException(
        'Impossible de supprimer une entrée org-level',
      );
    }

    await this.accessRepo.remove(access);
    return { success: true };
  }

  // async updateRole(
  //   userId: string,
  //   organizationId: string,
  //   newRole: AccessRole,
  // ) {
  //   const accesses = await this.accessRepo.find({
  //     where: { userId, organizationId },
  //   });

  //   if (accesses.length === 0) throw new NotFoundException('Membre non trouvé');

  //   const permissions = this.getDefaultPermissions(newRole);
  //   for (const access of accesses) {
  //     access.role = newRole;
  //     access.permissions = permissions;
  //   }
  //   await this.accessRepo.save(accesses);

  //   await this.userRepo.update(userId, { role: newRole });

  //   return { success: true, role: newRole };
  // }
  async updateRole(
    userId: string,
    organizationId: string,
    newRole: AccessRole,
  ) {
    const accesses = await this.accessRepo.find({
      where: { userId, organizationId },
    });

    if (accesses.length === 0) throw new NotFoundException('Membre non trouvé');

    const permissions = this.getDefaultPermissions(newRole);

    // ✅ Si passage à observer → supprimer toutes les entrées projet
    if (newRole === 'observer') {
      const projectAccesses = accesses.filter((a) => a.projectId !== null);
      if (projectAccesses.length > 0) {
        await this.accessRepo.remove(projectAccesses);
      }
    }

    // Mettre à jour l'entrée org-level
    const orgAccess = accesses.find((a) => a.projectId === null);
    if (orgAccess) {
      orgAccess.role = newRole;
      orgAccess.permissions = permissions;
      await this.accessRepo.save(orgAccess);
    }

    // Mettre à jour le rôle dans users
    await this.userRepo.update(userId, { role: newRole });

    return { success: true, role: newRole };
  }

  async revokeMember(userId: string, organizationId: string) {
    const accesses = await this.accessRepo.find({
      where: { userId, organizationId },
    });

    if (accesses.length === 0) throw new NotFoundException('Membre non trouvé');

    await this.accessRepo.remove(accesses);
    return { success: true };
  }

  async findUserProjects(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    const accesses = await this.accessRepo.find({
      where: { userId, organizationId, projectId: Not(IsNull()) },
    });
    return accesses.map((a) => a.projectId as string);
  }

  async isOrgMember(userId: string, organizationId: string): Promise<boolean> {
    const access = await this.accessRepo.findOne({
      where: { userId, organizationId },
    });
    return !!access;
  }

  async getOrgRole(
    userId: string,
    organizationId: string,
  ): Promise<string | null> {
    const access = await this.accessRepo.findOne({
      where: { userId, organizationId, projectId: IsNull() },
    });
    return access?.role ?? null;
  }

  async findByOrganization(organizationId: string) {
    return this.accessRepo.find({
      where: { organizationId, projectId: IsNull() },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string) {
    return this.accessRepo.find({
      where: { userId },
      relations: ['project'],
    });
  }

  async findByProject(projectId: string) {
    return this.accessRepo.find({
      where: { projectId },
      relations: ['user'],
    });
  }

  async checkPermission(
    userId: string,
    projectId: string,
    permission: string,
  ): Promise<boolean> {
    const access = await this.accessRepo.findOne({
      where: { userId, projectId },
    });
    if (!access) return false;
    return access.permissions.includes(permission);
  }

  async getUserPermissions(
    userId: string,
    projectId: string,
  ): Promise<string[]> {
    const access = await this.accessRepo.findOne({
      where: { userId, projectId },
    });
    return access?.permissions || [];
  }

  private getDefaultPermissions(role: AccessRole): string[] {
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
