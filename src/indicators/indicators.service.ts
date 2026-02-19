import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Indicator,
  IndicatorFrequency,
  IndicatorValue,
} from './entities/indicator.entity';
import { CreateIndicatorDto, AddValueDto, UpdateIndicatorDto } from './dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectRepository(Indicator)
    private indicatorRepo: Repository<Indicator>,
    @InjectRepository(IndicatorValue)
    private valueRepo: Repository<IndicatorValue>,
    private projectsService: ProjectsService,
  ) {}

  async findOne(indicatorId: string, orgId: string): Promise<Indicator> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project', 'values'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    return indicator;
  }

  async findByProject(projectId: string, orgId: string) {
    await this.projectsService.findOne(projectId, orgId);

    return this.indicatorRepo.find({
      where: { projectId },
      relations: ['values'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateIndicatorDto, orgId: string): Promise<Indicator> {
    const project = await this.projectsService.findOne(dto.projectId, orgId);

    if (project.status !== 'active') {
      throw new BadRequestException(
        `Impossible de créer un indicateur: le projet "${project.name}" n'est pas actif (statut: ${project.status}). ` +
          `Activez d'abord le projet.`,
      );
    }

    const indicator = new Indicator();
    indicator.name = dto.name;
    indicator.description = dto.description ?? null;
    indicator.type = dto.type as Indicator['type'];
    indicator.frequency =
      (dto.frequency as Indicator['frequency']) ?? 'monthly';
    indicator.targetValue = dto.targetValue ?? null;
    indicator.projectId = dto.projectId;

    return this.indicatorRepo.save(indicator);
  }

  async update(
    indicatorId: string,
    dto: UpdateIndicatorDto,
    orgId: string,
  ): Promise<Indicator> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    const updateData = dto as CreateIndicatorDto;
    indicator.name = updateData.name ?? indicator.name;
    indicator.description = updateData.description ?? indicator.description;
    indicator.type = (updateData.type as Indicator['type']) ?? indicator.type;
    indicator.frequency =
      (updateData.frequency as Indicator['frequency']) ?? indicator.frequency; // ✅ ajout
    indicator.targetValue = updateData.targetValue ?? indicator.targetValue;
    return this.indicatorRepo.save(indicator);
  }

  async remove(indicatorId: string, orgId: string): Promise<void> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    await this.indicatorRepo.remove(indicator);
  }

  async addValue(
    indicatorId: string,
    dto: AddValueDto,
    orgId: string,
  ): Promise<IndicatorValue> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    if (indicator.project.status !== 'active') {
      throw new BadRequestException(
        `Impossible d'ajouter une valeur: le projet n'est pas actif (statut: ${indicator.project.status})`,
      );
    }

    if (!this.validatePeriodFormat(dto.period, indicator.frequency)) {
      throw new BadRequestException(
        `Format de période invalide pour une fréquence "${this.getFrequencyLabel(indicator.frequency)}". ` +
          `Format attendu : ${this.getPeriodFormat(indicator.frequency)}`,
      );
    }

    let value = await this.valueRepo.findOne({
      where: { indicatorId, period: dto.period },
    });

    if (value) {
      value.value = dto.value;
      value.notes = dto.notes ?? null;
    } else {
      value = new IndicatorValue();
      value.indicatorId = indicatorId;
      value.value = dto.value;
      value.period = dto.period;
      value.notes = dto.notes ?? null;
    }

    return this.valueRepo.save(value);
  }

  async updateValue(
    indicatorId: string,
    valueId: string,
    dto: Partial<AddValueDto>,
    orgId: string,
  ): Promise<IndicatorValue> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    const value = await this.valueRepo.findOne({
      where: { id: valueId, indicatorId },
    });

    if (!value) {
      throw new NotFoundException('Valeur non trouvée');
    }

    Object.assign(value, {
      value: dto.value ?? value.value,
      period: dto.period ?? value.period,
      notes: dto.notes ?? value.notes,
    });

    return this.valueRepo.save(value);
  }

  async deleteValue(
    indicatorId: string,
    valueId: string,
    orgId: string,
  ): Promise<void> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    const value = await this.valueRepo.findOne({
      where: { id: valueId, indicatorId },
    });

    if (!value) {
      throw new NotFoundException('Valeur non trouvée');
    }

    await this.valueRepo.remove(value);
  }

  async getTimeline(
    indicatorId: string,
    orgId: string,
  ): Promise<IndicatorValue[]> {
    const indicator = await this.indicatorRepo.findOne({
      where: { id: indicatorId },
      relations: ['project'],
    });

    if (!indicator || indicator.project.organizationId !== orgId) {
      throw new NotFoundException('Indicateur non trouvé');
    }

    return this.valueRepo.find({
      where: { indicatorId },
      order: { period: 'ASC' },
    });
  }

  validatePeriodFormat(period: string, frequency: IndicatorFrequency): boolean {
    const patterns = {
      daily: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      weekly: /^\d{4}-W\d{2}$/, // YYYY-WXX
      monthly: /^\d{4}-\d{2}$/, // YYYY-MM
      quarterly: /^\d{4}-Q[1-4]$/, // YYYY-QX
      yearly: /^\d{4}$/, // YYYY
      free: /.*/, // Pas de contrainte
    };

    return patterns[frequency].test(period);
  }

  /**
   * Retourne le label de la fréquence pour l'affichage
   */
  getFrequencyLabel(frequency: IndicatorFrequency): string {
    const labels = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Annuel',
      free: 'Libre',
    };
    return labels[frequency];
  }

  /**
   * Retourne le format attendu pour la période
   */
  getPeriodFormat(frequency: IndicatorFrequency): string {
    const formats = {
      daily: 'YYYY-MM-DD (ex: 2026-02-19)',
      weekly: 'YYYY-WXX (ex: 2026-W08)',
      monthly: 'YYYY-MM (ex: 2026-02)',
      quarterly: 'YYYY-QX (ex: 2026-Q1)',
      yearly: 'YYYY (ex: 2026)',
      free: 'Texte libre',
    };
    return formats[frequency];
  }

  /**
   * Génère la période actuelle selon la fréquence
   */
  getCurrentPeriod(frequency: IndicatorFrequency): string {
    const now = new Date();
    const year = now.getFullYear();

    switch (frequency) {
      case 'daily':
        return now.toISOString().slice(0, 10);
      case 'weekly': {
        const week = Math.ceil(
          (now.getTime() - new Date(year, 0, 1).getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        );
        return `${year}-W${String(week).padStart(2, '0')}`;
      }
      case 'monthly':
        return now.toISOString().slice(0, 7);
      case 'quarterly': {
        const quarter = Math.ceil((now.getMonth() + 1) / 3);
        return `${year}-Q${quarter}`;
      }
      case 'yearly':
        return String(year);
      case 'free':
        return now.toISOString().slice(0, 7);
      default:
        return now.toISOString().slice(0, 7);
    }
  }
}
