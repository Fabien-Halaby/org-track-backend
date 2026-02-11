import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(@InjectRepository(Organization) private orgRepo: Repository<Organization>) {}

  async create(data: Partial<Organization>): Promise<Organization> {
    const org = this.orgRepo.create(data);
    return this.orgRepo.save(org);
  }

  async findOne(id: string): Promise<Organization> {
    return this.orgRepo.findOneOrFail({ where: { id } });
  }
}