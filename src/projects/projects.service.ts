import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';  // ← AJOUTÉ ProjectStatus
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  async findByOrganization(orgId: string, filters?: { status?: string }) {
    const query = this.projectRepo.createQueryBuilder('project')
      .where('project.organizationId = :orgId', { orgId });

    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    return query
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, orgId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, organizationId: orgId },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    return project;
  }

  async create(dto: CreateProjectDto, orgId: string, managerId: string): Promise<Project> {
    const project = new Project();
    project.name = dto.name;
    project.description = dto.description ?? null;
    project.status = (dto.status as ProjectStatus) ?? 'draft';
    project.budget = dto.budget ?? null;
    project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    project.endDate = dto.endDate ? new Date(dto.endDate) : null;
    project.managerId = dto.managerId ?? managerId;
    project.organizationId = orgId;

    return this.projectRepo.save(project);
  }

  async update(id: string, dto: UpdateProjectDto, orgId: string): Promise<Project> {
    const project = await this.findOne(id, orgId);
    
    if (dto.name !== undefined) {
        project.name = dto.name;
    }
    if (dto.description !== undefined) {
        project.description = dto.description;
    }
    if (dto.status !== undefined) {
        project.status = dto.status as ProjectStatus;
    }
    if (dto.budget !== undefined) {
        project.budget = dto.budget;
    }
    if (dto.startDate !== undefined) {
        project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
        project.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }
    if (dto.managerId !== undefined) {
        project.managerId = dto.managerId;
    }
    
    return this.projectRepo.save(project);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const project = await this.findOne(id, orgId);
    await this.projectRepo.remove(project);
  }
}