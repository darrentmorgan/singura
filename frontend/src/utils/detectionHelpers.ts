/**
 * Detection Helpers
 * Utility functions for working with detection patterns and metadata
 */

export type DetectionPatternType =
  | 'velocity'
  | 'batch_operation'
  | 'off_hours'
  | 'timing_variance'
  | 'permission_escalation'
  | 'data_volume'
  | 'ai_provider';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DetectionPattern {
  patternType: string; // Use string to match API type
  confidence: number;
  severity: SeverityLevel;
  detectedAt: string;
  evidence: {
    eventCount?: number;
    timeWindowMs?: number;
    automationConfidence?: number;
    [key: string]: unknown;
  };
  metadata?: {
    description?: string;
    supportingEvents?: string[];
    [key: string]: unknown;
  };
}

export interface DetectionMetadata {
  detectionPatterns?: DetectionPattern[];
  lastUpdated?: string;
  aiProvider?: {
    provider: string;
    confidence: number;
    detectionMethods: string[];
    evidence: unknown;
  };
}

export interface PatternGroup {
  type: string;
  count: number;
  avgConfidence: number;
  severity: SeverityLevel;
}

/**
 * Format pattern type for display
 */
export function formatPatternType(type: string): string {
  const typeMap: Record<string, string> = {
    'batch_operation': 'Batch Operations',
    'off_hours': 'Off-Hours Activity',
    'velocity': 'Velocity Anomaly',
    'permission_escalation': 'Permission Escalation',
    'data_volume': 'Data Volume',
    'timing_variance': 'Timing Variance',
    'ai_provider': 'AI Provider'
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Group detection patterns by type with aggregated statistics
 */
export function getPatternsByType(patterns: DetectionPattern[]): PatternGroup[] {
  const grouped = patterns.reduce((acc, pattern) => {
    const type = pattern.patternType;
    if (!acc[type]) {
      acc[type] = {
        patterns: [],
        totalConfidence: 0,
        highestSeverity: 'low' as SeverityLevel
      };
    }
    acc[type].patterns.push(pattern);
    acc[type].totalConfidence += pattern.confidence;

    // Track highest severity
    const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
    const currentSeverity = acc[type].highestSeverity;
    if (severityRank[pattern.severity] > severityRank[currentSeverity]) {
      acc[type].highestSeverity = pattern.severity;
    }

    return acc;
  }, {} as Record<string, {
    patterns: DetectionPattern[];
    totalConfidence: number;
    highestSeverity: SeverityLevel;
  }>);

  return Object.entries(grouped).map(([type, { patterns, totalConfidence, highestSeverity }]) => ({
    type,
    count: patterns.length,
    avgConfidence: Math.round(totalConfidence / patterns.length),
    severity: highestSeverity
  }));
}

/**
 * Get badge variant based on severity or confidence
 */
export function getSeverityVariant(
  severity: SeverityLevel | string | number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  // Handle numeric confidence scores
  if (typeof severity === 'number') {
    if (severity >= 90) return 'destructive';
    if (severity >= 70) return 'secondary';
    return 'default';
  }

  // Handle severity levels
  const severityMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'critical': 'destructive',
    'high': 'destructive',
    'medium': 'secondary',
    'low': 'default'
  };
  return severityMap[severity] || 'outline';
}

/**
 * Get severity badge color classes
 */
export function getSeverityColorClass(severity: SeverityLevel | string): string {
  const colorMap: Record<string, string> = {
    'critical': 'bg-red-600 text-white border-red-700',
    'high': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    'low': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
  };
  return colorMap[severity] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
}

/**
 * Calculate overall detection confidence from patterns
 */
export function calculateOverallConfidence(patterns: DetectionPattern[]): number {
  if (!patterns || patterns.length === 0) return 0;

  const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
  return Math.round(totalConfidence / patterns.length);
}

/**
 * Get unique detection methods from patterns
 */
export function getUniqueDetectionMethods(patterns: DetectionPattern[]): string[] {
  const methods = new Set(patterns.map(p => formatPatternType(p.patternType)));
  return Array.from(methods);
}

/**
 * Format date for display
 */
export function formatDetectionDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Parse detection metadata from API response
 */
export function parseDetectionMetadata(metadata: unknown): DetectionMetadata {
  if (!metadata) return {};

  // If it's a string, try to parse it
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }

  return metadata as DetectionMetadata;
}

/**
 * Get detection summary statistics
 */
export interface DetectionSummary {
  totalPatterns: number;
  avgConfidence: number;
  detectionMethods: string[];
  severityCounts: Record<SeverityLevel, number>;
  lastUpdated?: string;
}

export function getDetectionSummary(metadata: DetectionMetadata): DetectionSummary {
  const patterns = metadata.detectionPatterns || [];

  const severityCounts: Record<SeverityLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };

  patterns.forEach(p => {
    severityCounts[p.severity]++;
  });

  return {
    totalPatterns: patterns.length,
    avgConfidence: calculateOverallConfidence(patterns),
    detectionMethods: getUniqueDetectionMethods(patterns),
    severityCounts,
    lastUpdated: metadata.lastUpdated
  };
}
