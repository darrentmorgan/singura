import { AutomationEvent } from '@saas-xray/shared-types';

export const mockAutomationEvents: AutomationEvent[] = [
  {
    id: 'mock-auto-1',
    platform: 'slack',
    name: 'Sales Lead Notification',
    description: 'Automatically routes new Salesforce leads to Slack channel',
    riskScore: 3,
    permissions: ['read_channels', 'post_message'],
    createdAt: new Date('2025-01-15T10:30:00Z')
  },
  {
    id: 'mock-auto-2',
    platform: 'google-workspace',
    name: 'Performance Review Scheduler',
    description: 'Schedules quarterly performance review meetings in Google Calendar',
    riskScore: 2,
    permissions: ['calendar_write', 'user_email'],
    createdAt: new Date('2025-02-01T14:45:00Z')
  },
  {
    id: 'mock-auto-3',
    platform: 'microsoft-365',
    name: 'Expense Report Processor',
    description: 'Automatically categorizes and forwards expense reports to finance team',
    riskScore: 4,
    permissions: ['files_read', 'send_email'],
    createdAt: new Date('2025-03-10T09:15:00Z')
  },
  {
    id: 'mock-auto-4',
    platform: 'github',
    name: 'CI/CD Notification Bot',
    description: 'Sends build status notifications to development Slack channel',
    riskScore: 1,
    permissions: ['repo_status', 'read_org'],
    createdAt: new Date('2025-04-05T16:20:00Z')
  },
  {
    id: 'mock-auto-5',
    platform: 'hubspot',
    name: 'Marketing Campaign Sync',
    description: 'Synchronizes marketing campaign data between HubSpot and Salesforce',
    riskScore: 5,
    permissions: ['crm_read', 'crm_write'],
    createdAt: new Date('2025-05-20T11:55:00Z')
  }
];