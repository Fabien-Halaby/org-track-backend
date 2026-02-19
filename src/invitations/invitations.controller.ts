import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../permissions/guards/roles.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, VerifyInvitationDto } from './dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une invitation (génère un lien à copier)' })
  async create(
    @Body() dto: CreateInvitationDto,
    @Request() req: RequestWithUser,
  ) {
    console.log('DEBUG req.user:', req.user); // Pour voir la structure

    if (req.user.role === 'manager' && dto.role !== 'agent') {
      throw new BadRequestException('Manager can only invite agents');
    }

    const orgId = req.user.organizationId;

    if (!orgId) {
      throw new BadRequestException('Organization ID not found in token');
    }

    return this.invitationsService.create(dto, req.user.userId, orgId);
  }

  @Post('verify')
  @ApiOperation({ summary: "Vérifier un token d'invitation" })
  async verify(@Body() dto: VerifyInvitationDto): Promise<any> {
    return this.invitationsService.verifyToken(dto.token);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Liste des invitations de l'organisation" })
  async findAll(@Request() req: RequestWithUser) {
    return this.invitationsService.findByOrganization(req.user.organizationId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Révoquer une invitation' })
  async revoke(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.invitationsService.revoke(id, req.user.organizationId);
  }
}
