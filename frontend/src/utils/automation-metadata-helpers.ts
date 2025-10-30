/**
 * Automation Metadata Helpers
 * Frontend utilities for safely extracting enriched metadata from API responses
 */

import {
  OAuthContext,
  DetectionEvidence,
  TechnicalDetails,
  EnrichedMetadata
} from '../types/automation-metadata';

/**
 * Safely extract OAuth context from API response
 */
export function extractOAuthContext(enrichedMetadata?: EnrichedMetadata | null): OAuthContext | null {
  if (!enrichedMetadata?.oauth_context) {
    return null;
  }

  const context = enrichedMetadata.oauth_context;

  // Validate we have meaningful OAuth data
  if ((!context.scopes || context.scopes.length === 0) && !context.clientId && !context.authorizedBy) {
    return null;
  }

  return context;
}

/**
 * Safely extract detection evidence from API response
 */
export function extractDetectionEvidence(enrichedMetadata?: EnrichedMetadata | null): DetectionEvidence | null {
  if (!enrichedMetadata?.detection_evidence) {
    return null;
  }

  const evidence = enrichedMetadata.detection_evidence;

  // Validate we have meaningful detection data
  if (!evidence.method && !evidence.patterns?.length && !evidence.aiPlatforms?.length) {
    return null;
  }

  return evidence;
}

/**
 * Safely extract technical details from API response
 */
export function extractTechnicalDetails(enrichedMetadata?: EnrichedMetadata | null): TechnicalDetails | null {
  if (!enrichedMetadata?.technical_details) {
    return null;
  }

  const details = enrichedMetadata.technical_details;

  // Validate we have meaningful technical data
  if (!details.scriptId && !details.fileId && !details.driveFileId && !details.mimeType && !details.owners?.length) {
    return null;
  }

  return details;
}

/**
 * Format a timestamp for display
 * Reuses existing pattern from AutomationCard.tsx
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format time window in milliseconds to human-readable format
 */
export function formatTimeWindow(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  } else {
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

/**
 * Get confidence level color based on threshold
 * Reuses existing pattern from AutomationCard.tsx riskColors
 */
export function getConfidenceColor(confidence: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (confidence >= 80) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200'
    };
  } else if (confidence >= 50) {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200'
    };
  } else {
    return {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200'
    };
  }
}
