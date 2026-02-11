import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IndicatorsService } from './indicators.service';
import { CreateIndicatorDto, AddValueDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Indicateurs')
@Controller('indicators')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IndicatorsController {
  constructor(private service: IndicatorsService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: "Indicateurs d'un projet" })
  async findByProject(
    @Param('projectId') projectId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.findByProject(projectId, req.user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un indicateur' })
  async create(@Body() dto: CreateIndicatorDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.organizationId);
  }

  @Post(':id/values')
  @ApiOperation({ summary: 'Ajouter/modifier une valeur mensuelle' })
  async addValue(
    @Param('id') id: string,
    @Body() dto: AddValueDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.addValue(id, dto, req.user.organizationId);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Historique des valeurs' })
  async getTimeline(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.getTimeline(id, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un indicateur' })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.service.remove(id, req.user.organizationId);
    return { message: 'Indicateur supprimé' };
  }
}
