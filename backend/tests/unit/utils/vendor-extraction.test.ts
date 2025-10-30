/**
 * Vendor Extraction Utilities Unit Tests
 * Tests extraction of vendor names from OAuth app display text
 */

import { extractVendorName, generateVendorGroup } from '../../../src/utils/vendor-extraction';

describe('Vendor Extraction Utilities', () => {
  describe('extractVendorName', () => {
    describe('Valid vendor names', () => {
      it('should extract simple vendor name', () => {
        expect(extractVendorName('Attio')).toBe('Attio');
      });

      it('should extract vendor name and remove "CRM" suffix', () => {
        expect(extractVendorName('Attio CRM')).toBe('Attio');
      });

      it('should extract vendor name from domain', () => {
        expect(extractVendorName('attio.com')).toBe('attio');
      });

      it('should extract vendor name from "for Google Workspace" suffix', () => {
        expect(extractVendorName('Slack for Google Workspace')).toBe('Slack');
      });

      it('should extract vendor name and remove "OAuth" suffix', () => {
        expect(extractVendorName('HubSpot OAuth')).toBe('HubSpot');
      });

      it('should extract vendor name and remove "API" suffix', () => {
        expect(extractVendorName('Stripe API')).toBe('Stripe');
      });

      it('should extract vendor name and remove "App" suffix', () => {
        expect(extractVendorName('Salesforce App')).toBe('Salesforce');
      });

      it('should extract vendor name and remove "Integration" suffix', () => {
        expect(extractVendorName('Zapier Integration')).toBe('Zapier');
      });

      it('should extract vendor name from .io domain', () => {
        expect(extractVendorName('notion.io')).toBe('notion');
      });

      it('should extract vendor name from .ai domain', () => {
        expect(extractVendorName('openai.ai')).toBe('openai');
      });

      it('should extract vendor name from multi-word display text', () => {
        expect(extractVendorName('Zendesk Support Integration')).toBe('Zendesk');
      });

      it('should preserve case from original vendor name', () => {
        expect(extractVendorName('GitHub')).toBe('GitHub');
        expect(extractVendorName('LinkedIn')).toBe('LinkedIn');
      });

      it('should handle mixed case suffixes', () => {
        expect(extractVendorName('Asana CrM')).toBe('Asana');
        expect(extractVendorName('Jira For Google Workspace')).toBe('Jira');
      });

      it('should extract vendor from "for Gmail" suffix', () => {
        expect(extractVendorName('Mailchimp for Gmail')).toBe('Mailchimp');
      });

      it('should extract vendor from "for Slack" suffix', () => {
        expect(extractVendorName('Trello for Slack')).toBe('Trello');
      });

      it('should extract vendor from "Connector" suffix', () => {
        expect(extractVendorName('Snowflake Connector')).toBe('Snowflake');
      });

      it('should extract vendor from "Plugin" suffix', () => {
        expect(extractVendorName('Figma Plugin')).toBe('Figma');
      });

      it('should extract vendor from "Add-on" suffix', () => {
        expect(extractVendorName('Grammarly Add-on')).toBe('Grammarly');
      });

      it('should extract vendor from "Extension" suffix', () => {
        expect(extractVendorName('Loom Extension')).toBe('Loom');
      });
    });

    describe('Invalid vendor names (should return null)', () => {
      it('should return null for generic "OAuth App: ID" pattern', () => {
        expect(extractVendorName('OAuth App: 12345')).toBeNull();
      });

      it('should return null for empty string', () => {
        expect(extractVendorName('')).toBeNull();
      });

      it('should return null for null', () => {
        expect(extractVendorName(null)).toBeNull();
      });

      it('should return null for undefined', () => {
        expect(extractVendorName(undefined)).toBeNull();
      });

      it('should return null for whitespace-only string', () => {
        expect(extractVendorName('   ')).toBeNull();
      });

      it('should return null for names shorter than 3 characters', () => {
        expect(extractVendorName('AB')).toBeNull();
        expect(extractVendorName('A')).toBeNull();
      });

      it('should return null for generic "App" word', () => {
        expect(extractVendorName('App')).toBeNull();
      });

      it('should return null for generic "OAuth" word', () => {
        expect(extractVendorName('OAuth')).toBeNull();
      });

      it('should return null for generic "API" word', () => {
        expect(extractVendorName('API')).toBeNull();
      });

      it('should return null for generic "Client" word', () => {
        expect(extractVendorName('Client')).toBeNull();
      });

      it('should return null for generic "Token" word', () => {
        expect(extractVendorName('Token')).toBeNull();
      });

      it('should return null for generic "Application" word', () => {
        expect(extractVendorName('Application')).toBeNull();
      });

      it('should return null for non-string input (number)', () => {
        expect(extractVendorName(12345 as any)).toBeNull();
      });

      it('should return null for non-string input (object)', () => {
        expect(extractVendorName({ name: 'Attio' } as any)).toBeNull();
      });

      it('should return null for non-string input (array)', () => {
        expect(extractVendorName(['Attio'] as any)).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle multiple spaces between words', () => {
        expect(extractVendorName('Slack    for   Google   Workspace')).toBe('Slack');
      });

      it('should handle leading/trailing whitespace', () => {
        expect(extractVendorName('  Attio  ')).toBe('Attio');
      });

      it('should handle tabs and newlines', () => {
        expect(extractVendorName('\tAttio\n')).toBe('Attio');
      });

      it('should handle vendor name that is exactly 3 characters', () => {
        expect(extractVendorName('IBM')).toBe('IBM');
      });

      it('should handle domain with .co extension', () => {
        expect(extractVendorName('example.co')).toBe('example');
      });

      it('should handle vendor names with numbers', () => {
        expect(extractVendorName('Auth0')).toBe('Auth0');
      });

      it('should handle vendor names with hyphens', () => {
        expect(extractVendorName('Co-Pilot')).toBe('Co-Pilot');
      });

      it('should handle vendor names with underscores', () => {
        expect(extractVendorName('My_App CRM')).toBe('My_App');
      });

      it('should handle case-insensitive suffix matching', () => {
        expect(extractVendorName('Dropbox oauth')).toBe('Dropbox');
        expect(extractVendorName('Box OAUTH')).toBe('Box');
      });
    });
  });

  describe('generateVendorGroup', () => {
    describe('Valid vendor groups', () => {
      it('should generate vendor group from vendor and platform', () => {
        expect(generateVendorGroup('Attio', 'google')).toBe('attio-google');
      });

      it('should normalize to lowercase', () => {
        expect(generateVendorGroup('ATTIO', 'GOOGLE')).toBe('attio-google');
        expect(generateVendorGroup('Attio', 'Google')).toBe('attio-google');
      });

      it('should generate group for different platforms', () => {
        expect(generateVendorGroup('Slack', 'microsoft')).toBe('slack-microsoft');
        expect(generateVendorGroup('Salesforce', 'slack')).toBe('salesforce-slack');
      });

      it('should handle vendor names with spaces', () => {
        expect(generateVendorGroup('HubSpot CRM', 'google')).toBe('hubspot crm-google');
      });

      it('should trim whitespace from inputs', () => {
        expect(generateVendorGroup('  Attio  ', '  google  ')).toBe('attio-google');
      });

      it('should handle mixed case platforms', () => {
        expect(generateVendorGroup('GitHub', 'Google')).toBe('github-google');
      });
    });

    describe('Invalid vendor groups (should return null)', () => {
      it('should return null when vendor is null', () => {
        expect(generateVendorGroup(null, 'google')).toBeNull();
      });

      it('should return null when platform is null', () => {
        expect(generateVendorGroup('Attio', null)).toBeNull();
      });

      it('should return null when both are null', () => {
        expect(generateVendorGroup(null, null)).toBeNull();
      });

      it('should return null when vendor is undefined', () => {
        expect(generateVendorGroup(undefined, 'google')).toBeNull();
      });

      it('should return null when platform is undefined', () => {
        expect(generateVendorGroup('Attio', undefined)).toBeNull();
      });

      it('should return null when vendor is empty string', () => {
        expect(generateVendorGroup('', 'google')).toBeNull();
      });

      it('should return null when platform is empty string', () => {
        expect(generateVendorGroup('Attio', '')).toBeNull();
      });

      it('should return null when vendor is whitespace', () => {
        expect(generateVendorGroup('   ', 'google')).toBeNull();
      });

      it('should return null when platform is whitespace', () => {
        expect(generateVendorGroup('Attio', '   ')).toBeNull();
      });

      it('should return null for non-string vendor (number)', () => {
        expect(generateVendorGroup(12345 as any, 'google')).toBeNull();
      });

      it('should return null for non-string platform (number)', () => {
        expect(generateVendorGroup('Attio', 12345 as any)).toBeNull();
      });

      it('should return null for non-string vendor (object)', () => {
        expect(generateVendorGroup({ name: 'Attio' } as any, 'google')).toBeNull();
      });

      it('should return null for non-string platform (array)', () => {
        expect(generateVendorGroup('Attio', ['google'] as any)).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle vendor names with special characters', () => {
        expect(generateVendorGroup('Auth0', 'google')).toBe('auth0-google');
        expect(generateVendorGroup('Co-Pilot', 'google')).toBe('co-pilot-google');
      });

      it('should handle platform names with special characters', () => {
        expect(generateVendorGroup('Attio', 'google-workspace')).toBe('attio-google-workspace');
      });

      it('should produce unique groups for same vendor on different platforms', () => {
        const googleGroup = generateVendorGroup('Attio', 'google');
        const slackGroup = generateVendorGroup('Attio', 'slack');
        expect(googleGroup).not.toBe(slackGroup);
        expect(googleGroup).toBe('attio-google');
        expect(slackGroup).toBe('attio-slack');
      });

      it('should produce same group for same vendor/platform regardless of case', () => {
        const group1 = generateVendorGroup('Attio', 'google');
        const group2 = generateVendorGroup('ATTIO', 'GOOGLE');
        const group3 = generateVendorGroup('attio', 'google');
        expect(group1).toBe(group2);
        expect(group2).toBe(group3);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should extract vendor and generate group for Attio CRM', () => {
      const displayText = 'Attio CRM';
      const vendor = extractVendorName(displayText);
      const group = generateVendorGroup(vendor, 'google');

      expect(vendor).toBe('Attio');
      expect(group).toBe('attio-google');
    });

    it('should extract vendor and generate group for Slack for Google Workspace', () => {
      const displayText = 'Slack for Google Workspace';
      const vendor = extractVendorName(displayText);
      const group = generateVendorGroup(vendor, 'google');

      expect(vendor).toBe('Slack');
      expect(group).toBe('slack-google');
    });

    it('should handle full workflow: attio.com on Microsoft', () => {
      const displayText = 'attio.com';
      const vendor = extractVendorName(displayText);
      const group = generateVendorGroup(vendor, 'microsoft');

      expect(vendor).toBe('attio');
      expect(group).toBe('attio-microsoft');
    });

    it('should return null group when vendor extraction fails', () => {
      const displayText = 'OAuth App: 12345';
      const vendor = extractVendorName(displayText);
      const group = generateVendorGroup(vendor, 'google');

      expect(vendor).toBeNull();
      expect(group).toBeNull();
    });

    it('should handle multiple OAuth apps from same vendor', () => {
      const apps = [
        { displayText: 'Attio', clientId: 'client-1' },
        { displayText: 'Attio CRM', clientId: 'client-2' },
        { displayText: 'Attio API', clientId: 'client-3' }
      ];

      const groups = apps.map(app => {
        const vendor = extractVendorName(app.displayText);
        return generateVendorGroup(vendor, 'google');
      });

      // All should map to same vendor group
      expect(groups[0]).toBe('attio-google');
      expect(groups[1]).toBe('attio-google');
      expect(groups[2]).toBe('attio-google');

      // Verify uniqueness: all point to same group
      const uniqueGroups = new Set(groups);
      expect(uniqueGroups.size).toBe(1);
    });

    it('should differentiate same vendor on different platforms', () => {
      const displayText = 'Salesforce';
      const vendor = extractVendorName(displayText);

      const googleGroup = generateVendorGroup(vendor, 'google');
      const slackGroup = generateVendorGroup(vendor, 'slack');
      const microsoftGroup = generateVendorGroup(vendor, 'microsoft');

      expect(googleGroup).toBe('salesforce-google');
      expect(slackGroup).toBe('salesforce-slack');
      expect(microsoftGroup).toBe('salesforce-microsoft');

      // All should be different
      expect(new Set([googleGroup, slackGroup, microsoftGroup]).size).toBe(3);
    });
  });
});
