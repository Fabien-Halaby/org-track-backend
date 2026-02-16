import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Projets')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des projets de mon organisation' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'active', 'completed', 'cancelled'] })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    return this.service.findByOrganization(req.user.organizationId, { status });
  }

  @Post()
  @ApiOperation({ summary: 'Créer un projet (validation dates incluse)' })
  async create(@Body() dto: CreateProjectDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.organizationId, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d un projet' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un projet (avec validation transitions)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(id, dto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un projet (interdit si actif)' })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.service.remove(id, req.user.organizationId);
    return { message: 'Projet supprimé avec succès' };
  }

  // === ACTIONS MANUELLES ===

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activer manuellement un projet (draft → active)' })
  async activate(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const project = await this.service.activate(id, req.user.organizationId);
    return { 
      message: 'Projet activé avec succès',
      project,
      auto: false 
    };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Terminer manuellement un projet (active → completed)' })
  async complete(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const project = await this.service.complete(id, req.user.organizationId);
    return {
      message: 'Projet terminé avec succès',
      project
    };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Annuler un projet (draft/active → cancelled)' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: RequestWithUser,
  ) {
    const project = await this.service.cancel(id, req.user.organizationId, reason);
    return {
      message: 'Projet annulé avec succès',
      project,
      reason
    };
  }

  // === ADMIN: Scheduler manual trigger ===

  @Post('admin/auto-update-statuses')
  @ApiOperation({ summary: '[Admin] Déclencher manuellement la mise à jour auto des statuts' })
  async triggerAutoUpdate(@Req() req: RequestWithUser) {
    // Vérifier que c'est un admin
    if (req.user.role !== 'admin') {
      return { error: 'Accès réservé aux administrateurs' };
    }
    
    const result = await this.service.autoUpdateStatuses();
    return {
      message: `${result.updated} projet(s) mis à jour`,
      details: result.details
    };
  }
}