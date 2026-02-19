import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ProjectAccessModule } from './project-access/project-access.module';
import { PermissionsModule } from './permissions/permissions.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'orgtrack',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: true,
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    IndicatorsModule,
    ReportsModule,
    DashboardModule,
    InvitationsModule,
    ProjectAccessModule,
    PermissionsModule,
  ],
})
export class AppModule {}
