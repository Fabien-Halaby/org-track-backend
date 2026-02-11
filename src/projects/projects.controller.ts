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
  @ApiOperation({ summary: 'Créer un projet' })
  async create(@Body() dto: CreateProjectDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.organizationId, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d un projet' })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un projet' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(id, dto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un projet' })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.service.remove(id, req.user.organizationId);
    return { message: 'Projet supprimé avec succès' };
  }
}