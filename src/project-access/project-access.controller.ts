import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectAccessService } from './project-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../permissions/guards/roles.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import type { AccessRole } from './entities/project-access.entity';

@ApiTags('Membres')
@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectAccessController {
  constructor(private service: ProjectAccessService) {}

  // Liste des membres avec leurs projets
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: "Membres de l'organisation avec projets assignés" })
  async findAll(@Req() req: RequestWithUser) {
    return this.service.findMembersWithProjects(req.user.organizationId);
  }

  // Assigner un projet à un membre
  @Post(':userId/projects')
  @Roles('admin')
  @ApiOperation({ summary: 'Assigner un projet à un membre' })
  async assignProject(
    @Param('userId') userId: string,
    @Body('projectId') projectId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.assignProject(
      userId,
      projectId,
      req.user.organizationId,
      req.user.userId,
    );
  }

  // Retirer un projet d'un membre
  @Delete('access/:accessId')
  @Roles('admin')
  @ApiOperation({ summary: "Retirer l'accès à un projet" })
  async revokeProject(
    @Param('accessId') accessId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.revokeProject(accessId, req.user.organizationId);
  }

  // Changer le rôle d'un membre
  @Patch(':userId/role')
  @Roles('admin')
  @ApiOperation({ summary: "Modifier le rôle d'un membre" })
  async updateRole(
    @Param('userId') userId: string,
    @Body('role') role: AccessRole,
    @Req() req: RequestWithUser,
  ) {
    // Empêcher l'admin de changer son propre rôle
    if (userId === req.user.userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier votre propre rôle',
      );
    }
    return this.service.updateRole(userId, req.user.organizationId, role);
  }

  // Révoquer un membre de l'org
  @Delete(':userId')
  @Roles('admin')
  @ApiOperation({ summary: "Révoquer un membre de l'organisation" })
  async revokeMember(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    if (userId === req.user.userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas vous révoquer vous-même',
      );
    }
    return this.service.revokeMember(userId, req.user.organizationId);
  }
}
