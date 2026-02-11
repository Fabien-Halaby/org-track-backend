import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health() {
    return {
      status: 'ok',
      service: 'ImpactTrack API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
