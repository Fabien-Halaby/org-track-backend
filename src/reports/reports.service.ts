import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Indicator,
    IndicatorValue,
} from '../indicators/entities/indicator.entity';
import * as puppeteer from 'puppeteer';
import * as ExcelJS from 'exceljs';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ReportsService {
  constructor(
    private projectsService: ProjectsService,
    @InjectRepository(Indicator)
    private indicatorRepo: Repository<Indicator>,
    @InjectRepository(IndicatorValue)
    private valueRepo: Repository<IndicatorValue>,
  ) {}

  // Nouvelle méthode : charge indicateurs + toutes les valeurs
  private async getIndicatorsWithHistory(projectId: string, orgId: string) {
    // Vérifier que le projet appartient à l'org
    await this.projectsService.findOne(projectId, orgId);

    const indicators = await this.indicatorRepo.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    });

    // Charger toutes les valeurs pour chaque indicateur
    for (const indicator of indicators) {
      indicator.values = await this.valueRepo.find({
        where: { indicatorId: indicator.id },
        order: { period: 'ASC' },
      });
    }

    return indicators;
  }

  async generateProjectPdf(projectId: string, orgId: string): Promise<Buffer> {
    const project = await this.projectsService.findOne(projectId, orgId);
    const indicators = await this.getIndicatorsWithHistory(projectId, orgId);

    const html = this.buildPdfTemplate(project, indicators);

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });
    
    await browser.close();

    return Buffer.from(pdf);
  }

  async generateProjectExcel(projectId: string, orgId: string): Promise<Buffer> {
    const project = await this.projectsService.findOne(projectId, orgId);
    const indicators = await this.getIndicatorsWithHistory(projectId, orgId);

    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet('Résumé');

    // === FEUILLE RÉSUMÉ ===
    summarySheet.mergeCells('A1:E1');
    summarySheet.getCell('A1').value = project.name;
    summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '2563EB' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.mergeCells('A2:E2');
    summarySheet.getCell('A2').value = `Généré le ${new Date().toLocaleDateString('fr-FR')}`;
    summarySheet.getCell('A2').alignment = { horizontal: 'center' };
    summarySheet.getCell('A2').font = { italic: true, color: { argb: '6B7280' } };

    // Infos projet
    summarySheet.addRow([]);
    summarySheet.addRow(['Statut', project.status, '', 'Budget', project.budget ? `${project.budget} €` : 'N/A']);
    summarySheet.addRow(['Description', project.description || 'N/A']);

    // Tableau résumé indicateurs
    summarySheet.addRow([]);
    summarySheet.addRow(['INDICATEURS - RÉSUMÉ']).font = { bold: true, size: 14 };
    
    const headerRow = summarySheet.addRow(['Indicateur', 'Type', 'Objectif', 'Valeur actuelle', 'Nb de saisies']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

    indicators.forEach(ind => {
      const currentValue = ind.values?.length ? ind.values[ind.values.length - 1].value : 0;
      
      summarySheet.addRow([
        ind.name,
        ind.type,
        ind.targetValue || 'N/A',
        currentValue,
        ind.values?.length || 0
      ]);
    });

    // === FEUILLES DÉTAIL PAR INDICATEUR ===
    indicators.forEach((index, indicator) => {
      let sheetName = indicator.name.substring(0, 25);
      if (sheetName.length === 0) sheetName = 'Indicateur';
  
      const finalName = index === 0 ? sheetName : `${sheetName} (${index + 1})`;
  
      const sheet = workbook.addWorksheet(finalName);
       
      sheet.addRow([`Indicateur: ${indicator.name}`]).font = { bold: true, size: 14 };
      sheet.addRow([`Type: ${indicator.type} | Objectif: ${indicator.targetValue || 'N/A'}`]);
      sheet.addRow([]);
      
      // Tableau historique
      const histHeader = sheet.addRow(['Période', 'Valeur', 'Notes', 'Date de saisie']);
      histHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
      histHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };
      
      if (indicator.values?.length) {
        indicator.values.forEach(val => {
          sheet.addRow([
            val.period,
            val.value,
            val.notes || '',
            new Date(val.createdAt).toLocaleDateString('fr-FR')
          ]);
        });
        
        // Ligne total/progression
        const lastValue = indicator.values[indicator.values.length - 1].value;
        sheet.addRow([]);
        const totalRow = sheet.addRow(['', 'DERNIÈRE VALEUR:', lastValue, '']);
        totalRow.font = { bold: true };
        
        if (indicator.targetValue) {
          const progress = Math.min((Number(lastValue) / Number(indicator.targetValue)) * 100, 100);
          sheet.addRow(['', 'PROGRESSION:', `${progress.toFixed(1)}%`, '']);
        }
      } else {
        sheet.addRow(['Aucune valeur saisie pour cet indicateur']);
      }
      
      // Auto-width
      sheet.columns.forEach(column => {
        column.width = 20;
      });
    });

    // Auto-width résumé
    summarySheet.columns.forEach(column => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildPdfTemplate(project: any, indicators: any[]): string {
    const now = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Génère le HTML pour chaque indicateur avec son historique
    const indicatorsHtml = indicators.map(ind => {
      const currentValue = ind.values?.length ? ind.values[ind.values.length - 1].value : 0;
      const progress = ind.targetValue 
        ? Math.min((Number(currentValue) / Number(ind.targetValue)) * 100, 100)
        : 0;

      // Historique des valeurs
      const historyRows = ind.values?.length 
        ? ind.values.map((val: any) => `
          <tr style="font-size: 12px; color: #6b7280;">
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${val.period}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #111827;">${val.value}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6;">${val.notes || '-'}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="3" style="padding: 12px; color: #9ca3af; text-align: center;">Aucune valeur saisie</td></tr>';

      return `
        <div style="margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <!-- Header indicateur -->
          <div style="background: #f9fafb; padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="margin: 0; font-size: 18px; color: #111827;">${ind.name}</h3>
                ${ind.description ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">${ind.description}</p>` : ''}
              </div>
              <span style="background: #f3f4f6; padding: 4px 12px; border-radius: 9999px; font-size: 12px; text-transform: uppercase; color: #374151;">
                ${ind.type}
              </span>
            </div>
          </div>
          
          <!-- Stats -->
          <div style="padding: 20px; background: white;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
              <div style="text-align: center; padding: 12px; background: #eff6ff; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #2563eb; margin-bottom: 4px;">Objectif</div>
                <div style="font-size: 20px; font-weight: 700; color: #1e40af;">${ind.targetValue || '-'}</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #f0fdf4; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #16a34a; margin-bottom: 4px;">Actuel</div>
                <div style="font-size: 20px; font-weight: 700; color: #166534;">${currentValue}</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #f5f3ff; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #7c3aed; margin-bottom: 4px;">Progression</div>
                <div style="font-size: 20px; font-weight: 700; color: #5b21b6;">${progress > 0 ? progress.toFixed(0) + '%' : '-'}</div>
              </div>
            </div>
            
            <!-- Barre de progression -->
            ${progress > 0 ? `
              <div style="margin-bottom: 20px;">
                <div style="height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px;"></div>
                </div>
              </div>
            ` : ''}
            
            <!-- Tableau historique -->
            <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Historique des saisies</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Période</th>
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Valeur</th>
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Notes</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            padding: 40px;
          }
          .header { 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2563eb;
            margin-bottom: 8px;
          }
          h1 { font-size: 28px; color: #111827; margin-bottom: 8px; }
          .meta { color: #6b7280; font-size: 14px; }
          
          .info-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 16px; 
            margin: 24px 0;
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
          }
          .info-item { text-align: center; }
          .info-label { 
            font-size: 12px; 
            text-transform: uppercase; 
            color: #6b7280;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .info-value { 
            font-size: 20px; 
            font-weight: 700; 
            color: #111827;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ImpactTrack</div>
          <h1>${project.name}</h1>
          <p class="meta">Rapport complet généré le ${now}</p>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Statut</div>
            <div class="info-value" style="text-transform: uppercase; font-size: 14px; color: #2563eb;">
              ${project.status}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Budget</div>
            <div class="info-value">
              ${project.budget ? project.budget.toLocaleString('fr-FR') + ' €' : 'Non défini'}
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Indicateurs</div>
            <div class="info-value">${indicators.length}</div>
          </div>
        </div>

        <h2 style="font-size: 20px; margin-bottom: 20px; color: #111827;">Détail des indicateurs</h2>
        
        ${indicatorsHtml || '<p style="color: #9ca3af; text-align: center; padding: 40px;">Aucun indicateur suivi pour ce projet</p>'}

        <div class="footer">
          ImpactTrack - Solution de suivi d'impact pour organisations
        </div>
      </body>
      </html>
    `;
  }
}
