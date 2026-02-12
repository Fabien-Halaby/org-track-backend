import { Controller, Get, Param, Res, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('📄 Rapports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('project/:id/pdf')
  @ApiOperation({ summary: "Générer rapport PDF d'un projet" })
  async generatePdf(
    @Param('id') projectId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateProjectPdf(
      projectId, 
      req.user.organizationId
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename=rapport-${projectId}.pdf`,
    );
    res.send(buffer);
  }

  @Get('project/:id/excel')
  @ApiOperation({ summary: 'Exporter données Excel d\'un projet' })
  async generateExcel(
    @Param('id') projectId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateProjectExcel(
      projectId,
      req.user.organizationId
    );

    res.setHeader(
      'Content-Type', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename=donnees-${projectId}.xlsx`
    );
    res.send(buffer);
  }
}
