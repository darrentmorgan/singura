/**
 * Organization Metadata Service
 * Business logic for managing organization metadata
 */

import { OrganizationMetadata, ConnectionStats } from '@singura/shared-types';
import { organizationMetadataRepository } from '../database/repositories/organization-metadata.repository';

export class OrganizationMetadataService {
  /**
   * Get organization metadata by organization ID
   */
  async getMetadata(organizationId: string): Promise<OrganizationMetadata | null> {
    try {
      // First try to get existing metadata
      let metadata = await organizationMetadataRepository.findByOrganizationId(organizationId);

      // If not found, create a default entry
      if (!metadata) {
        metadata = await organizationMetadataRepository.upsert(organizationId, {
          organizationId,
          organizationSize: 'unknown',
          industryVertical: 'unknown'
        });
      }

      return metadata;
    } catch (error) {
      console.error('Error getting organization metadata:', error);
      // Return a default object on error to prevent downstream failures
      return {
        organizationId,
        organizationSize: 'unknown',
        industryVertical: 'unknown'
      };
    }
  }

  /**
   * Update organization metadata
   */
  async updateMetadata(
    organizationId: string,
    metadata: Partial<OrganizationMetadata>
  ): Promise<void> {
    try {
      await organizationMetadataRepository.update(organizationId, metadata);
    } catch (error) {
      console.error('Error updating organization metadata:', error);
      throw error;
    }
  }

  /**
   * Set organization size
   */
  async setOrganizationSize(
    organizationId: string,
    size: 'small' | 'medium' | 'large' | 'enterprise' | 'unknown'
  ): Promise<void> {
    try {
      // Map size to employee count ranges
      const employeeCountMap: Record<string, number> = {
        small: 25,     // 1-50 employees
        medium: 250,   // 51-500 employees
        large: 2500,   // 501-5000 employees
        enterprise: 10000, // 5000+ employees
        unknown: 0
      };

      await organizationMetadataRepository.update(organizationId, {
        organizationSize: size,
        employeeCount: employeeCountMap[size] || 0
      });
    } catch (error) {
      console.error('Error setting organization size:', error);
      throw error;
    }
  }

  /**
   * Set industry vertical
   */
  async setIndustryVertical(
    organizationId: string,
    vertical: string
  ): Promise<void> {
    try {
      await organizationMetadataRepository.update(organizationId, {
        industryVertical: vertical
      });
    } catch (error) {
      console.error('Error setting industry vertical:', error);
      throw error;
    }
  }

  /**
   * Set company details
   */
  async setCompanyDetails(
    organizationId: string,
    details: {
      companyName?: string;
      companyWebsite?: string;
      employeeCount?: number;
      country?: string;
      stateProvince?: string;
      timezone?: string;
    }
  ): Promise<void> {
    try {
      await organizationMetadataRepository.update(organizationId, details);
    } catch (error) {
      console.error('Error setting company details:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(
    connectionId: string,
    organizationId: string
  ): Promise<ConnectionStats> {
    try {
      return await organizationMetadataRepository.getConnectionStats(connectionId, organizationId);
    } catch (error) {
      console.error('Error getting connection stats:', error);
      // Return default stats on error
      return {
        automationCount: 0,
        lastScanAt: null,
        riskLevel: 'low'
      };
    }
  }

  /**
   * Get all connections statistics for an organization
   */
  async getAllConnectionStats(
    organizationId: string,
    connectionIds: string[]
  ): Promise<Map<string, ConnectionStats>> {
    try {
      const statsMap = new Map<string, ConnectionStats>();

      // Fetch stats for each connection in parallel
      const statsPromises = connectionIds.map(async (connectionId) => {
        const stats = await this.getConnectionStats(connectionId, organizationId);
        return { connectionId, stats };
      });

      const results = await Promise.all(statsPromises);

      results.forEach(({ connectionId, stats }) => {
        statsMap.set(connectionId, stats);
      });

      return statsMap;
    } catch (error) {
      console.error('Error getting all connection stats:', error);
      return new Map();
    }
  }

  /**
   * Initialize default metadata for an organization
   */
  async initializeMetadata(
    organizationId: string,
    initialData?: Partial<OrganizationMetadata>
  ): Promise<OrganizationMetadata> {
    try {
      return await organizationMetadataRepository.upsert(organizationId, {
        organizationId,
        organizationSize: 'unknown',
        industryVertical: 'unknown',
        ...initialData
      });
    } catch (error) {
      console.error('Error initializing organization metadata:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const organizationMetadataService = new OrganizationMetadataService();