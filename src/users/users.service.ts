import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ 
      where: { email }
    });
  }

  async findOne(id: string): Promise<User> {
    return this.userRepo.findOneOrFail({ 
      where: { id },
      relations: ['organization'],
    });
  }

  async findByOrganization(orgId: string): Promise<User[]> {
    return this.userRepo.find({
      where: { organizationId: orgId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.userRepo.update(userId, { refreshToken });
  }
}