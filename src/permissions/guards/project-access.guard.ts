import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ProjectAccessService } from '../../project-access/project-access.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectAccessService: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId || request.body.projectId || request.query.projectId;

    if (user.role === 'admin') return true;

    if (user.role === 'observer' && requiredPermissions.every(p => p === 'read')) {
      return true;
    }

    if (!projectId) {
      throw new ForbiddenException('Project ID required');
    }

    const userPermissions = await this.projectAccessService.getUserPermissions(user.userId, projectId);
    
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for this project');
    }

    return true;
  }
}
