import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Indicator, IndicatorValue } from '../indicators/entities/indicator.entity';

// Types explicites
export interface MonthPeriod {
  label: string;
  start: Date;
  end: Date;
}

export interface AlertItem {
  type: 'no_data' | 'stale_data' | 'low_progress';
  severity: 'critical' | 'warning' | 'info';
  indicator: { id: string; name: string };
  project: { id: string; name: string };
  message: string;
  since?: Date;
  lastUpdate?: Date;
  progress?: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Indicator)
    private indicatorRepo: Repository<Indicator>,
    @InjectRepository(IndicatorValue)
    private valueRepo: Repository<IndicatorValue>,
  ) {}

  async getGlobalStats(orgId: string) {
    // Projets
    const projects = await this.projectRepo.find({
      where: { organizationId: orgId },
    });

    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

    // Indicateurs
    const indicators = await this.indicatorRepo.find({
      where: { project: { organizationId: orgId } },
      relations: ['project', 'values'],
    });

    const totalIndicators = indicators.length;
    const indicatorsWithTarget = indicators.filter(i => i.targetValue !== null).length;
    
    // Calcul progression moyenne
    let totalProgress = 0;
    let indicatorsWithProgress = 0;
    
    indicators.forEach(ind => {
      if (ind.targetValue && ind.values?.length > 0) {
        const lastValue = ind.values[ind.values.length - 1].value;
        const progress = Math.min((Number(lastValue) / Number(ind.targetValue)) * 100, 100);
        totalProgress += progress;
        indicatorsWithProgress++;
      }
    });

    const averageProgress = indicatorsWithProgress > 0 
      ? Math.round(totalProgress / indicatorsWithProgress) 
      : 0;

    // Valeurs ce mois-ci
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const valuesThisMonth = await this.valueRepo.count({
      where: {
        indicator: { project: { organizationId: orgId } },
        createdAt: Between(firstDayOfMonth, now),
      },
    });

    return {
      projects: {
        total: projects.length,
        active: activeProjects,
        completed: completedProjects,
        completionRate: projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0,
      },
      indicators: {
        total: totalIndicators,
        withTarget: indicatorsWithTarget,
        averageProgress,
        valuesThisMonth,
      },
      financial: {
        totalBudget,
        averageBudget: projects.length > 0 ? totalBudget / projects.length : 0,
      },
    };
  }

  async getTrends(orgId: string) {
    // Données sur 12 mois
    const months: MonthPeriod[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      });
    }

    const trends = await Promise.all(
      months.map(async (month) => {
        const valuesCount = await this.valueRepo.count({
          where: {
            indicator: { project: { organizationId: orgId } },
            createdAt: Between(month.start, month.end),
          },
        });

        const newProjects = await this.projectRepo.count({
          where: {
            organizationId: orgId,
            createdAt: Between(month.start, month.end),
          },
        });

        return {
          period: month.label,
          valuesAdded: valuesCount,
          projectsCreated: newProjects,
        };
      })
    );

    return trends;
  }

  async getAlerts(orgId: string) {
    const indicators = await this.indicatorRepo.find({
      where: { project: { organizationId: orgId } },
      relations: ['project', 'values'],
    });

    const alerts: AlertItem[] = [];

    indicators.forEach(ind => {
      // Pas de valeurs depuis 3 mois
      if (!ind.values || ind.values.length === 0) {
        alerts.push({
          type: 'no_data',
          severity: 'warning',
          indicator: { id: ind.id, name: ind.name },
          project: { id: ind.project.id, name: ind.project.name },
          message: 'Aucune valeur saisie',
          since: ind.createdAt,
        });
      } else {
        const lastValue = ind.values[ind.values.length - 1];
        const lastUpdate = new Date(lastValue.createdAt);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (lastUpdate < threeMonthsAgo) {
          alerts.push({
            type: 'stale_data',
            severity: 'warning',
            indicator: { id: ind.id, name: ind.name },
            project: { id: ind.project.id, name: ind.project.name },
            message: 'Données obsolètes',
            lastUpdate: lastValue.createdAt,
          });
        }

        // Objectif non atteint à moins de 20%
        if (ind.targetValue) {
          const progress = (Number(lastValue.value) / Number(ind.targetValue)) * 100;
          if (progress < 20 && ind.values.length > 1) {
            alerts.push({
              type: 'low_progress',
              severity: 'info',
              indicator: { id: ind.id, name: ind.name },
              project: { id: ind.project.id, name: ind.project.name },
              message: 'Progression faible',
              progress: Math.round(progress),
            });
          }
        }
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }).slice(0, 10);
  }

  async getRecentActivity(orgId: string) {
    // Dernières valeurs ajoutées
    const recentValues = await this.valueRepo.find({
      where: { indicator: { project: { organizationId: orgId } } },
      relations: ['indicator', 'indicator.project'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Derniers projets créés
    const recentProjects = await this.projectRepo.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const activity = [
      ...recentValues.map(v => ({
        type: 'value_added' as const,
        date: v.createdAt,
        description: `Valeur ajoutée à "${v.indicator.name}"`,
        project: v.indicator.project.name,
        details: `${v.period}: ${v.value}`,
      })),
      ...recentProjects.map(p => ({
        type: 'project_created' as const,
        date: p.createdAt,
        description: `Projet créé: "${p.name}"`,
        project: p.name,
        details: `Statut: ${p.status}`,
      })),
    ];

    return activity.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 10);
  }
}