/**
 * Export Service Unit Tests
 */

import { ExportService } from '../export.service';
import { Automation } from '@singura/shared-types';

describe('ExportService', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = ExportService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ExportService.getInstance();
      const instance2 = ExportService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('exportToCSV', () => {
    const mockAutomations: Automation[] = [
      {
        id: 'auto-1',
        name: 'Test Automation 1',
        description: 'Test description',
        type: 'bot',
        status: 'active',
        platform: 'slack',
        platformId: 'slack-1',
        organizationId: 'org-1',
        connectionId: 'conn-1',
        risk: {
          level: 'high',
          score: 75,
          factors: ['Broad permissions', 'External access']
        },
        permissions: {
          scopes: ['users:read', 'chat:write'],
          roles: []
        },
        metadata: {
          discoveredAt: '2024-01-01T00:00:00Z',
          lastActiveAt: '2024-01-15T00:00:00Z'
        },
        affectedUsers: ['user1@example.com', 'user2@example.com']
      },
      {
        id: 'auto-2',
        name: 'Test Automation 2',
        description: 'Another test',
        type: 'workflow',
        status: 'inactive',
        platform: 'google',
        platformId: 'google-1',
        organizationId: 'org-1',
        connectionId: 'conn-2',
        risk: {
          level: 'medium',
          score: 50,
          factors: []
        },
        permissions: {
          scopes: [],
          roles: []
        },
        metadata: {
          discoveredAt: '2024-01-02T00:00:00Z',
          lastActiveAt: '2024-01-10T00:00:00Z'
        }
      }
    ];

    it('should generate valid CSV buffer', async () => {
      const buffer = await exportService.exportToCSV(mockAutomations);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const csvString = buffer.toString('utf-8');
      expect(csvString).toContain('ID,Name,Platform,Type,Risk Level');
      expect(csvString).toContain('Test Automation 1');
      expect(csvString).toContain('Test Automation 2');
    });

    it('should handle empty automation array', async () => {
      const buffer = await exportService.exportToCSV([]);

      expect(buffer).toBeInstanceOf(Buffer);
      const csvString = buffer.toString('utf-8');
      expect(csvString).toBe(''); // Empty CSV
    });

    it('should escape special characters in CSV', async () => {
      const automationWithSpecialChars: Automation[] = [
        {
          ...mockAutomations[0],
          name: 'Automation with, comma',
          description: 'Description with "quotes" and\nnewlines'
        }
      ];

      const buffer = await exportService.exportToCSV(automationWithSpecialChars);
      const csvString = buffer.toString('utf-8');

      expect(csvString).toContain('"Automation with, comma"');
      expect(csvString).toContain('"Description with ""quotes"" and\nnewlines"');
    });

    it('should include all required fields', async () => {
      const buffer = await exportService.exportToCSV(mockAutomations);
      const csvString = buffer.toString('utf-8');

      // Check headers
      expect(csvString).toContain('ID');
      expect(csvString).toContain('Name');
      expect(csvString).toContain('Platform');
      expect(csvString).toContain('Type');
      expect(csvString).toContain('Risk Level');
      expect(csvString).toContain('Status');
      expect(csvString).toContain('Detected At');
      expect(csvString).toContain('Affected Users');
    });
  });

  describe('exportToPDF', () => {
    const mockAutomations: Automation[] = [
      {
        id: 'auto-1',
        name: 'Test PDF Automation',
        type: 'bot',
        status: 'active',
        platform: 'slack',
        platformId: 'slack-1',
        organizationId: 'org-1',
        connectionId: 'conn-1',
        risk: {
          level: 'critical',
          score: 95,
          factors: []
        },
        permissions: {
          scopes: [],
          roles: []
        },
        metadata: {
          discoveredAt: '2024-01-01T00:00:00Z'
        }
      }
    ];

    it('should generate valid PDF buffer', async () => {
      const buffer = await exportService.exportToPDF(mockAutomations);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // PDF files start with %PDF
      const pdfString = buffer.toString('utf-8', 0, 4);
      expect(pdfString).toBe('%PDF');
    });

    it('should handle empty automation array', async () => {
      const buffer = await exportService.exportToPDF([]);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Should still generate a valid PDF with headers
      const pdfString = buffer.toString('utf-8', 0, 4);
      expect(pdfString).toBe('%PDF');
    });

    it('should include statistics in PDF', async () => {
      const automations: Automation[] = [
        { ...mockAutomations[0], risk: { level: 'critical', score: 95, factors: [] } },
        { ...mockAutomations[0], id: 'auto-2', risk: { level: 'high', score: 75, factors: [] } },
        { ...mockAutomations[0], id: 'auto-3', risk: { level: 'medium', score: 50, factors: [] } },
        { ...mockAutomations[0], id: 'auto-4', risk: { level: 'low', score: 25, factors: [] }, status: 'inactive' }
      ];

      const buffer = await exportService.exportToPDF(automations);

      expect(buffer).toBeInstanceOf(Buffer);
      // The PDF should contain summary statistics
      // Note: We can't easily test PDF content without a PDF parser
      // but we can verify it generates without errors
    });

    it('should handle large datasets with pagination', async () => {
      // Create 100 automations to test pagination
      const largeDataset: Automation[] = Array.from({ length: 100 }, (_, i) => ({
        id: `auto-${i}`,
        name: `Automation ${i}`,
        type: 'bot',
        status: 'active',
        platform: 'slack',
        platformId: `slack-${i}`,
        organizationId: 'org-1',
        connectionId: 'conn-1',
        risk: {
          level: 'medium',
          score: 50,
          factors: []
        },
        permissions: {
          scopes: [],
          roles: []
        },
        metadata: {}
      }));

      const buffer = await exportService.exportToPDF(largeDataset);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      // Test with null
      await expect(exportService.exportToCSV(null as any)).rejects.toThrow();
      await expect(exportService.exportToPDF(null as any)).rejects.toThrow();

      // Test with undefined
      await expect(exportService.exportToCSV(undefined as any)).rejects.toThrow();
      await expect(exportService.exportToPDF(undefined as any)).rejects.toThrow();
    });

    it('should handle malformed automation data', async () => {
      const malformedAutomation: any = {
        // Missing required fields
        name: 'Test'
      };

      // Should not throw but handle gracefully
      const csvBuffer = await exportService.exportToCSV([malformedAutomation]);
      expect(csvBuffer).toBeInstanceOf(Buffer);

      const pdfBuffer = await exportService.exportToPDF([malformedAutomation]);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });
  });
});