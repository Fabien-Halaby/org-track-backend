import { Test, TestingModule } from '@nestjs/testing';
import { ProjectAccessService } from './project-access.service';

describe('ProjectAccessService', () => {
  let service: ProjectAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectAccessService],
    }).compile();

    service = module.get<ProjectAccessService>(ProjectAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
