import { UserRole } from '../../users/entities/user.entity';

export interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
}
