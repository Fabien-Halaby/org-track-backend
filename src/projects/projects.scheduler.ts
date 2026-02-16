import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectsScheduler {
  private readonly logger = new Logger(ProjectsScheduler.name);

  constructor(private projectsService: ProjectsService) {}

  /**
   * Exécuté tous les jours à minuit
   * Met à jour automatiquement les statuts des projets
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStatusUpdate() {
    this.logger.log('Démarrage de la mise à jour automatique des statuts...');
    
    try {
      const result = await this.projectsService.autoUpdateStatuses();
      
      if (result.updated > 0) {
        this.logger.log(`${result.updated} projet(s) mis à jour:`);
        result.details.forEach(detail => this.logger.log(`  - ${detail}`));
      } else {
        this.logger.log('Aucun projet à mettre à jour');
      }
    } catch (error) {
      this.logger.error('Erreur lors de la mise à jour des statuts:', error);
    }
  }
}