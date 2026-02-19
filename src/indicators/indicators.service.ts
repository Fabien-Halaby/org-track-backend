import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indicator, IndicatorValue } from './entities/indicator.entity';
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
}
