import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccess } from './entities/project-access.entity';
import { CreateProjectAccessDto } from './dto/create-project-access.dto';

@Injectable()
export class ProjectAccessService {
  constructor(
    @InjectRepository(ProjectAccess)
    private accessRepo: Repository<ProjectAccess>,
  ) {}

  async create(dto: CreateProjectAccessDto) {
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

  async findUserProjects(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    const accesses = await this.accessRepo.find({
      where: { userId, organizationId },
    });
    return accesses
      .map((a) => a.projectId)
      .filter((id): id is string => id !== null);
  }

  async isOrgMember(userId: string, organizationId: string): Promise<boolean> {
    const access = await this.accessRepo.findOne({
      where: { userId, organizationId, projectId: null },
    });
    return !!access;
  }

  async getOrgRole(
    userId: string,
    organizationId: string,
  ): Promise<string | null> {
    const access = await this.accessRepo.findOne({
      where: { userId, organizationId, projectId: null },
    });
    return access?.role ?? null;
  }

  async findByOrganization(organizationId: string) {
    return this.accessRepo.find({
      where: { organizationId, projectId: null },
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
}
