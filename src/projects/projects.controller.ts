import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { Roles } from 'src/permissions/decorators/roles.decorator';

@ApiTags('Projets')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Get()
  @Roles('admin', 'manager', 'agent', 'observer')
  @ApiOperation({ summary: 'Liste des projets selon mon rôle' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@Req() req: RequestWithUser, @Query('status') status?: string) {
    return this.service.findByOrganization(
      req.user.organizationId,
      { status },
      req.user.userId,
      req.user.role,
    );
  }

  @Post()
  @Roles('admin', 'manager')
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
  @Roles('admin', 'manager')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(id, dto, req.user.organizationId);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.service.remove(id, req.user.organizationId);
    return { message: 'Projet supprimé avec succès' };
  }

  @Post(':id/activate')
  @Roles('admin', 'manager')
  async activate(@Param('id') id: string, @Req() req: RequestWithUser) {
    const project = await this.service.activate(id, req.user.organizationId);
    return { message: 'Projet activé avec succès', project, auto: false };
  }

  @Post(':id/complete')
  @Roles('admin', 'manager')
  async complete(@Param('id') id: string, @Req() req: RequestWithUser) {
    const project = await this.service.complete(id, req.user.organizationId);
    return { message: 'Projet terminé avec succès', project };
  }

  @Post(':id/cancel')
  @Roles('admin', 'manager')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: RequestWithUser,
  ) {
    const project = await this.service.cancel(
      id,
      req.user.organizationId,
      reason,
    );
    return { message: 'Projet annulé avec succès', project, reason };
  }

  @Post('admin/auto-update-statuses')
  @Roles('admin')
  async triggerAutoUpdate(@Req() req: RequestWithUser) {
    console.log('DEBUG triggerAutoUpdate called by user:', req.user);
    const result = await this.service.autoUpdateStatuses();
    return {
      message: `${result.updated} projet(s) mis à jour`,
      details: result.details,
    };
  }
}
