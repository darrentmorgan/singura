/**
 * Data Provider Service
 * Handles switching between real and mock data sources
 */

export interface DataProvider {
  isUsingMockData(): boolean;
  toggleMockData(): void;
  setUseMockData(useMock: boolean): void;
}

class DataProviderService implements DataProvider {
  private useMockData = false;

  isUsingMockData(): boolean {
    return this.useMockData;
  }

  toggleMockData(): void {
    this.useMockData = !this.useMockData;
  }

  setUseMockData(useMock: boolean): void {
    this.useMockData = useMock;
  }
}

export const dataProvider = new DataProviderService();