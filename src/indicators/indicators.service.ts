import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indicator, IndicatorValue } from './entities/indicator.entity';
import { CreateIndicatorDto, AddValueDto } from './dto';
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

  async findByProject(projectId: string, orgId: string) {
    await this.projectsService.findOne(projectId, orgId);

    return this.indicatorRepo.find({
      where: { projectId },
      relations: ['values'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateIndicatorDto, orgId: string): Promise<Indicator> {
    await this.projectsService.findOne(dto.projectId, orgId);

    const indicator = new Indicator();
    indicator.name = dto.name;
    indicator.description = dto.description ?? null;
    indicator.type = dto.type as Indicator['type'];
    indicator.targetValue = dto.targetValue ?? null;
    indicator.projectId = dto.projectId;

    return this.indicatorRepo.save(indicator);
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
}
