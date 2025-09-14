import { AutomationEvent } from '@saas-xray/shared-types';
import { DataProvider } from './data-provider';

export async function getDiscoveredAutomations(): Promise<AutomationEvent[]> {
  const dataProvider = DataProvider.getInstance();
  return await dataProvider.getAutomationEvents();
}

export async function getDiscoveryStatus() {
  const events = await getDiscoveredAutomations();
  return {
    totalAutomations: events.length,
    averageRiskScore: events.reduce((sum, event) => sum + event.riskScore, 0) / events.length,
    platforms: [...new Set(events.map(event => event.platform))]
  };
}