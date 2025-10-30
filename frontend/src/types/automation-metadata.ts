/**
 * Automation Metadata Types
 * Frontend interfaces for enriched automation metadata display
 */

export interface OAuthContext {
  scopes: string[];
  scopeCount: number;
  authorizedBy?: string;
  clientId?: string;
  firstAuthorization?: string;
  lastActivity?: string;
  authorizationAge?: number;
}

export interface DetectionPattern {
  description: string;
  eventCount: number;
  timeWindowMs: number;
  confidence: number;
  supportingEvents?: string[];
}

export interface AIPlatformDetection {
  name: string;
  confidence: number;
  endpoints?: string[];
}

export interface DetectionEvidence {
  method: string;
  confidence: number;
  lastUpdated?: string;
  patterns: DetectionPattern[];
  aiPlatforms?: AIPlatformDetection[];
}

export interface TechnicalDetails {
  scriptId?: string;
  fileId?: string;
  driveFileId?: string;
  driveLocation?: string;
  mimeType?: string;
  parentType?: string;
  owners?: string[];
  shared?: boolean;
  functions?: string[];
  triggers?: string[];
  description?: string;
}

export interface EnrichedMetadata {
  oauth_context: OAuthContext | null;
  detection_evidence: DetectionEvidence | null;
  technical_details: TechnicalDetails | null;
}
