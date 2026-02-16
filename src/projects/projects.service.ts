import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { addDays, isBefore, isAfter, isSameDay, format } from 'date-fns';
import { Project, ProjectStatus } from './entities/project.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto';

// Définition des transitions valides
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [], // Terminal
  cancelled: [], // Terminal
};

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

  /**
   * Valide les dates selon les règles métier
   */
  private validateDates(
    startDate?: Date | null, 
    endDate?: Date | null, 
    currentStatus?: ProjectStatus,
    isCreation: boolean = false
  ): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Si on fournit les deux dates
    if (startDate && endDate) {
      if (endDate <= startDate) {
        throw new BadRequestException('La date de fin doit être après la date de début');
      }
    }

    // Règles de création
    if (isCreation && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      // Date de début doit être aujourd'hui ou dans le futur
      if (start < today) {
        throw new BadRequestException('La date de début doit être aujourd\'hui ou dans le futur');
      }
    }

    // Règles de mise à jour selon le statut
    if (currentStatus === 'active' && endDate) {
      const end = new Date(endDate);
      if (end < today) {
        throw new BadRequestException('Impossible de modifier la date de fin dans le passé pour un projet actif');
      }
    }
  }

  /**
   * Valide la transition de statut
   */
  private validateStatusTransition(
    current: ProjectStatus, 
    next: ProjectStatus,
    project: Project
  ): void {
    // Même statut = OK
    if (current === next) return;

    // Vérifier si la transition est valide
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Transition invalide: ${current} → ${next}. Transitions possibles: ${allowed.join(', ') || 'aucune'}`
      );
    }

    // Règles spécifiques
    if (current === 'draft' && next === 'active') {
      // Vérifier qu'on a une date de début
      if (!project.startDate) {
        throw new BadRequestException('Impossible d\'activer un projet sans date de début');
      }
    }

    if (current === 'active' && next === 'completed') {
      // Vérifier qu'on a une date de fin ou qu'elle est atteinte
      if (project.endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(project.endDate);
        if (end > today) {
          throw new BadRequestException('Impossible de terminer un projet avant sa date de fin prévue');
        }
      }
    }
  }

    async create(dto: CreateProjectDto, orgId: string, managerId: string): Promise<Project> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = dto.startDate ? new Date(dto.startDate) : null;
    let endDate = dto.endDate ? new Date(dto.endDate) : null;

    // RÈGLE: Si statut = brouillon → date début doit être demain ou plus
    if (dto.status === 'draft' || !dto.status) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        // Vérifier que c'est demain ou plus tard
        const tomorrow = addDays(today, 1);
        
        if (isBefore(start, tomorrow)) {
          throw new BadRequestException(
            'Pour un projet en brouillon, la date de début doit être au minimum demain. ' +
            'Si vous voulez démarrer aujourd\'hui, choisissez le statut "Actif".'
          );
        }
      }
      // Si pas de date de début en brouillon = OK (à définir plus tard)
    }

    // RÈGLE: Si statut = active → date début = aujourd'hui forcément
    if (dto.status === 'active') {
      startDate = today; // On force aujourd'hui
      
      if (endDate && isBefore(endDate, today)) {
        throw new BadRequestException('La date de fin ne peut pas être dans le passé');
      }
    }

    // Validation: fin > début (si les deux existent)
    if (startDate && endDate && !isAfter(endDate, startDate)) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }

    const project = new Project();
    project.name = dto.name;
    project.description = dto.description ?? null;
    project.status = (dto.status as ProjectStatus) ?? 'draft';
    project.budget = dto.budget ?? null;
    project.startDate = startDate;
    project.endDate = endDate;
    project.managerId = dto.managerId ?? managerId;
    project.organizationId = orgId;

    return this.projectRepo.save(project);
  }

  async update(id: string, dto: UpdateProjectDto, orgId: string): Promise<Project> {
    const project = await this.findOne(id, orgId);
    const oldStatus = project.status;

    // Gestion du changement de statut
    if (dto.status && dto.status !== oldStatus) {
      this.validateStatusTransition(oldStatus, dto.status as ProjectStatus, project);
      project.status = dto.status as ProjectStatus;
    }

    // Validation des nouvelles dates avant assignation
    const newStartDate = dto.startDate !== undefined 
      ? (dto.startDate ? new Date(dto.startDate) : null)
      : project.startDate;
    const newEndDate = dto.endDate !== undefined
      ? (dto.endDate ? new Date(dto.endDate) : null)
      : project.endDate;

    this.validateDates(newStartDate, newEndDate, project.status, false);

    // Mise à jour des champs
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.budget !== undefined) project.budget = dto.budget;
    if (dto.startDate !== undefined) project.startDate = newStartDate;
    if (dto.endDate !== undefined) project.endDate = newEndDate;
    if (dto.managerId !== undefined) project.managerId = dto.managerId;
    
    return this.projectRepo.save(project);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const project = await this.findOne(id, orgId);
    
    // Empêcher la suppression des projets actifs avec des données
    if (project.status === 'active') {
      throw new BadRequestException('Impossible de supprimer un projet actif. Annulez-le d\'abord.');
    }
    
    await this.projectRepo.remove(project);
  }

  /**
   * Actions manuelles sur les projets
   */
    async activate(id: string, orgId: string): Promise<Project> {
    const project = await this.findOne(id, orgId);
    
    // Vérifier que c'est bien un draft
    if (project.status !== 'draft') {
      throw new BadRequestException(`Impossible d'activer un projet ${project.status}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // RÈGLE: Activation manuelle = démarrage immédiat, date forcée à aujourd'hui
    // On garde trace de l'ancienne date si elle existait
    if (project.startDate) {
      const oldDate = new Date(project.startDate);
      oldDate.setHours(0, 0, 0, 0);
      
      if (!isSameDay(oldDate, today)) {
        const oldDateStr = format(oldDate, 'dd/MM/yyyy');
        const todayStr = format(today, 'dd/MM/yyyy');
        
        const note = `[Démarrage anticipé: ${oldDateStr} → ${todayStr}]`;
        project.description = project.description 
          ? `${note}\n${project.description}` 
          : note;
      }
    }
    
    project.startDate = today;
    project.status = 'active';
    
    return this.projectRepo.save(project);
  }

  async complete(id: string, orgId: string): Promise<Project> {
    const project = await this.findOne(id, orgId);
    this.validateStatusTransition(project.status, 'completed', project);
    
    project.status = 'completed';
    return this.projectRepo.save(project);
  }

  async cancel(id: string, orgId: string, reason?: string): Promise<Project> {
    const project = await this.findOne(id, orgId);
    this.validateStatusTransition(project.status, 'cancelled', project);
    
    project.status = 'cancelled';
    // On pourrait stocker la raison dans la description ou un champ dédié
    if (reason) {
      project.description = `[ANNULÉ] ${reason}\n\n${project.description || ''}`;
    }
    
    return this.projectRepo.save(project);
  }


    async autoUpdateStatuses(): Promise<{ updated: number; details: string[] }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const details: string[] = [];
    let updated = 0;

    // 1. Draft → Active (date début atteinte ou dépassée)
    const toActivate = await this.projectRepo.find({
      where: {
        status: 'draft',
        startDate: LessThanOrEqual(today), // Aujourd'hui ou avant
      },
    });

    for (const project of toActivate) {
      // Vérifier que c'est bien aujourd'hui ou passé (pas demain)
      const start = new Date(project.startDate!);
      start.setHours(0, 0, 0, 0);
      
      if (isBefore(start, addDays(today, 1))) {
        project.status = 'active';
        await this.projectRepo.save(project);
        updated++;
        details.push(
          `${project.name}: brouillon → actif (début prévu le ${format(start, 'dd/MM/yyyy')})`
        );
      }
    }

    // 2. Active → Completed (date fin atteinte ou dépassée)
    const toComplete = await this.projectRepo.find({
      where: {
        status: 'active',
        endDate: LessThanOrEqual(today),
      },
    });

    for (const project of toComplete) {
      project.status = 'completed';
      await this.projectRepo.save(project);
      updated++;
      details.push(
        `${project.name}: actif → terminé (fin le ${format(project.endDate!, 'dd/MM/yyyy')})`
      );
    }

    return { updated, details };
  }
}