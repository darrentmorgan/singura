/**
 * Automation Metadata Extraction Helpers
 * Transforms raw JSONB data from database into structured UI-friendly format
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

export interface DetectionEvidence {
  method: string;
  confidence: number;
  lastUpdated?: string;
  patterns: DetectionPattern[];
  aiPlatforms?: AIPlatformDetection[];
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

/**
 * Extract OAuth authorization context from platform metadata
 */
export function extractOAuthContext(platformMetadata: any): OAuthContext | null {
  if (!platformMetadata || typeof platformMetadata !== 'object') {
    return null;
  }

  // Check if we have OAuth-related fields
  const hasOAuthData = platformMetadata.scopes ||
                      platformMetadata.clientId ||
                      platformMetadata.authorizedBy;

  if (!hasOAuthData) {
    return null;
  }

  const scopesArray = Array.isArray(platformMetadata.scopes) ? platformMetadata.scopes : [];

  return {
    scopes: scopesArray,
    scopeCount: platformMetadata.scopeCount || scopesArray.length,
    authorizedBy: platformMetadata.authorizedBy,
    clientId: platformMetadata.clientId,
    firstAuthorization: platformMetadata.firstAuthorization,
    lastActivity: platformMetadata.lastActivity,
    authorizationAge: platformMetadata.authorizationAge
  };
}

/**
 * Extract AI detection evidence from detection metadata
 */
export function extractDetectionEvidence(detectionMetadata: any, platformMetadata: any): DetectionEvidence | null {
  // Need either detection metadata or platform AI detection data
  if (!detectionMetadata && !platformMetadata) {
    return null;
  }

  const hasDetectionData = detectionMetadata?.detectionPatterns ||
                          detectionMetadata?.lastUpdated ||
                          platformMetadata?.isAIPlatform ||
                          platformMetadata?.detectionMethod;

  if (!hasDetectionData) {
    return null;
  }

  // Extract detection patterns
  const patterns: DetectionPattern[] = [];
  if (detectionMetadata?.detectionPatterns && Array.isArray(detectionMetadata.detectionPatterns)) {
    for (const pattern of detectionMetadata.detectionPatterns) {
      if (pattern.evidence || pattern.metadata) {
        patterns.push({
          description: pattern.metadata?.description || 'Pattern detected',
          eventCount: pattern.evidence?.eventCount || 0,
          timeWindowMs: pattern.evidence?.timeWindowMs || 0,
          confidence: pattern.evidence?.automationConfidence || 0,
          supportingEvents: pattern.metadata?.supportingEvents?.slice(0, 10) // Limit to first 10
        });
      }
    }
  }

  // Calculate overall confidence
  let confidence = 0;
  if (patterns.length > 0) {
    confidence = patterns[0].confidence; // Use highest confidence pattern
  } else if (platformMetadata?.aiPlatformConfidence) {
    confidence = platformMetadata.aiPlatformConfidence;
  }

  // Extract AI platform detections
  const aiPlatforms: AIPlatformDetection[] = [];
  if (platformMetadata?.isAIPlatform && platformMetadata?.aiPlatforms) {
    const platforms = Array.isArray(platformMetadata.aiPlatforms)
      ? platformMetadata.aiPlatforms
      : [platformMetadata.aiPlatforms];

    for (const platform of platforms) {
      aiPlatforms.push({
        name: typeof platform === 'string' ? platform : platform.name,
        confidence: platformMetadata.aiPlatformConfidence || 0,
        endpoints: platformMetadata.aiEndpoints
      });
    }
  }

  return {
    method: platformMetadata?.detectionMethod || 'unknown',
    confidence,
    lastUpdated: detectionMetadata?.lastUpdated,
    patterns,
    aiPlatforms: aiPlatforms.length > 0 ? aiPlatforms : undefined
  };
}

/**
 * Extract technical details from platform metadata
 */
export function extractTechnicalDetails(platformMetadata: any): TechnicalDetails | null {
  if (!platformMetadata || typeof platformMetadata !== 'object') {
    return null;
  }

  // Check if we have any technical details
  const hasTechnicalData = platformMetadata.scriptId ||
                          platformMetadata.fileId ||
                          platformMetadata.driveFileId ||
                          platformMetadata.mimeType ||
                          platformMetadata.owners ||
                          platformMetadata.functions ||
                          platformMetadata.triggers;

  if (!hasTechnicalData) {
    return null;
  }

  // Extract owner names from objects if needed
  let owners: string[] | undefined;
  if (Array.isArray(platformMetadata.owners)) {
    owners = platformMetadata.owners.map(owner => {
      if (typeof owner === 'string') {
        return owner;
      }
      if (typeof owner === 'object' && owner !== null) {
        // Handle owner objects with displayName or emailAddress
        return owner.displayName || owner.emailAddress || owner.email || 'Unknown';
      }
      return 'Unknown';
    });
  }

  return {
    scriptId: platformMetadata.scriptId,
    fileId: platformMetadata.fileId,
    driveFileId: platformMetadata.driveFileId,
    driveLocation: platformMetadata.driveLocation,
    mimeType: platformMetadata.mimeType,
    parentType: platformMetadata.parentType,
    owners,
    shared: platformMetadata.shared,
    functions: Array.isArray(platformMetadata.functions) ? platformMetadata.functions : undefined,
    triggers: Array.isArray(platformMetadata.triggers) ? platformMetadata.triggers : undefined,
    description: platformMetadata.description
  };
}
