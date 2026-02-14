import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService, AlertItem } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales du dashboard' })
  async getStats(@Req() req: RequestWithUser) {
    return this.dashboardService.getGlobalStats(req.user.organizationId);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Tendances sur 12 mois' })
  async getTrends(@Req() req: RequestWithUser) {
    return this.dashboardService.getTrends(req.user.organizationId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Indicateurs en alerte' })
  async getAlerts(@Req() req: RequestWithUser): Promise<AlertItem[]> {
    return this.dashboardService.getAlerts(req.user.organizationId);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Activité récente' })
  async getRecentActivity(@Req() req: RequestWithUser) {
    return this.dashboardService.getRecentActivity(req.user.organizationId);
  }
}