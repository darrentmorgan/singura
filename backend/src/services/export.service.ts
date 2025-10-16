/**
 * Export Service
 * Handles CSV and PDF export functionality for automations
 */

import * as csv from 'csv-writer';
import PDFDocument from 'pdfkit';
import { Automation, RiskLevel } from '@singura/shared-types';
import { logger } from '../utils/logger';

export interface ExportRequest {
  automationIds: string[];
  organizationId: string;
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeMetadata?: boolean;
}

export class ExportService {
  private static instance: ExportService;

  private constructor() {}

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export automations to CSV format
   */
  async exportToCSV(automations: Automation[]): Promise<Buffer> {
    try {
      logger.info(`Exporting ${automations.length} automations to CSV`);

      // Prepare CSV data
      const csvData = automations.map(automation => ({
        ID: automation.id,
        Name: automation.name,
        Platform: automation.platform,
        Type: automation.type,
        'Risk Level': automation.risk?.level || 'unknown',
        'Risk Score': automation.risk?.score || 0,
        Status: automation.status,
        'Detected At': automation.metadata?.discoveredAt || 'unknown',
        'Last Active': automation.metadata?.lastActiveAt || 'unknown',
        'Affected Users': automation.affectedUsers?.join(', ') || 'N/A',
        Description: automation.description || '',
        'AI Provider': automation.aiInfo?.provider || 'N/A',
        'Organization ID': automation.organizationId
      }));

      // Create CSV string manually (csv-writer doesn't return buffer directly)
      const headers = Object.keys(csvData[0] || {});
      const csvString = [
        headers.join(','),
        ...csvData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row] || '');
            // Escape values containing commas or quotes
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      return Buffer.from(csvString, 'utf-8');
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw new Error('Failed to generate CSV export');
    }
  }

  /**
   * Export automations to PDF format
   */
  async exportToPDF(automations: Automation[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        logger.info(`Exporting ${automations.length} automations to PDF`);

        const doc = new PDFDocument({
          margin: 50,
          size: 'A4'
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header with Singura branding
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('Singura AI', { align: 'center' });

        doc.fontSize(16)
           .font('Helvetica')
           .fillColor('#374151')
           .text('Automation Export Report', { align: 'center' });

        doc.moveDown();

        // Add export metadata
        const exportDate = new Date().toLocaleString();
        doc.fontSize(10)
           .fillColor('#6b7280')
           .text(`Generated: ${exportDate}`, { align: 'right' });

        doc.moveDown();

        // Add summary statistics
        const stats = this.calculateStatistics(automations);

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#111827')
           .text('Summary Statistics');

        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#374151');

        doc.text(`• Total Automations: ${stats.total}`);
        doc.text(`• Active: ${stats.active} | Inactive: ${stats.inactive}`);
        doc.text(`• Risk Distribution: Critical (${stats.critical}) | High (${stats.high}) | Medium (${stats.medium}) | Low (${stats.low})`);
        doc.text(`• Platforms: ${stats.platforms.join(', ')}`);

        doc.moveDown(2);

        // Add automations table
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Automation Details');

        doc.moveDown();

        // Table header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 150;
        const col3 = 250;
        const col4 = 350;
        const col5 = 450;

        doc.fontSize(10)
           .font('Helvetica-Bold');

        doc.text('Name', col1, tableTop);
        doc.text('Platform', col2, tableTop);
        doc.text('Type', col3, tableTop);
        doc.text('Risk', col4, tableTop);
        doc.text('Status', col5, tableTop);

        // Draw header underline
        doc.moveTo(col1, tableTop + 15)
           .lineTo(520, tableTop + 15)
           .stroke();

        // Table rows
        doc.font('Helvetica')
           .fontSize(9);

        let yPosition = tableTop + 25;

        automations.forEach((automation, index) => {
          // Check if we need a new page
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;

            // Repeat header on new page
            doc.fontSize(10)
               .font('Helvetica-Bold');

            doc.text('Name', col1, yPosition);
            doc.text('Platform', col2, yPosition);
            doc.text('Type', col3, yPosition);
            doc.text('Risk', col4, yPosition);
            doc.text('Status', col5, yPosition);

            doc.moveTo(col1, yPosition + 15)
               .lineTo(520, yPosition + 15)
               .stroke();

            yPosition += 25;
            doc.font('Helvetica')
               .fontSize(9);
          }

          // Truncate long names
          const name = automation.name.length > 20
            ? automation.name.substring(0, 17) + '...'
            : automation.name;

          doc.text(name, col1, yPosition);
          doc.text(automation.platform, col2, yPosition);
          doc.text(automation.type, col3, yPosition);
          doc.text(automation.risk?.level || 'unknown', col4, yPosition);
          doc.text(automation.status, col5, yPosition);

          // Alternate row background
          if (index % 2 === 1) {
            doc.rect(col1 - 5, yPosition - 3, 475, 15)
               .fillColor('#f9fafb')
               .fill()
               .fillColor('#374151');
          }

          yPosition += 18;
        });

        // Add footer with page numbers
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor('#6b7280')
             .text(
               `Page ${i + 1} of ${pages.count}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }

        // Finalize the PDF
        doc.end();
      } catch (error) {
        logger.error('Error exporting to PDF:', error);
        reject(new Error('Failed to generate PDF export'));
      }
    });
  }

  /**
   * Calculate statistics for the summary section
   */
  private calculateStatistics(automations: Automation[]) {
    const stats = {
      total: automations.length,
      active: 0,
      inactive: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      platforms: new Set<string>()
    };

    automations.forEach(automation => {
      // Status counts
      if (automation.status === 'active') stats.active++;
      else if (automation.status === 'inactive') stats.inactive++;

      // Risk level counts
      const riskLevel = automation.risk?.level;
      if (riskLevel === 'critical') stats.critical++;
      else if (riskLevel === 'high') stats.high++;
      else if (riskLevel === 'medium') stats.medium++;
      else if (riskLevel === 'low') stats.low++;

      // Unique platforms
      stats.platforms.add(automation.platform);
    });

    return {
      ...stats,
      platforms: Array.from(stats.platforms)
    };
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance();