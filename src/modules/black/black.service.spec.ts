import { Test, TestingModule } from '@nestjs/testing';
import { BlackService } from './black.service';

describe('BlackService', () => {
  let service: BlackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlackService],
    }).compile();

    service = module.get<BlackService>(BlackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
