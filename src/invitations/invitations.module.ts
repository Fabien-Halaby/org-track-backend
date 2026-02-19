import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Invitation } from './entities/invitation.entity';
import { ProjectAccessModule } from '../project-access/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    JwtModule.register({}),
    ProjectAccessModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
