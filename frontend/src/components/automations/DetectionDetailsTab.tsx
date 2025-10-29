/**
 * Detection Details Tab Component
 * Displays comprehensive detection pattern information for an automation
 */

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DetectionMetadata,
  formatPatternType,
  getPatternsByType,
  getSeverityVariant,
  getSeverityColorClass,
  calculateOverallConfidence,
  formatDetectionDate
} from '@/utils/detectionHelpers';

interface DetectionDetailsTabProps {
  detectionMetadata?: DetectionMetadata;
}

const PATTERNS_PER_PAGE = 10;

export const DetectionDetailsTab: React.FC<DetectionDetailsTabProps> = ({
  detectionMetadata
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPattern, setExpandedPattern] = useState<number | null>(null);

  if (!detectionMetadata?.detectionPatterns || detectionMetadata.detectionPatterns.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Detection Data Available</h3>
        <p className="text-muted-foreground">
          This automation has not been analyzed by our detection algorithms yet.
        </p>
      </div>
    );
  }

  const patterns = detectionMetadata.detectionPatterns;
  const patternsByType = getPatternsByType(patterns);
  const overallConfidence = calculateOverallConfidence(patterns);

  // Pagination
  const totalPages = Math.ceil(patterns.length / PATTERNS_PER_PAGE);
  const startIdx = (currentPage - 1) * PATTERNS_PER_PAGE;
  const endIdx = startIdx + PATTERNS_PER_PAGE;
  const paginatedPatterns = patterns.slice(startIdx, endIdx);

  const handleTogglePattern = (index: number) => {
    setExpandedPattern(expandedPattern === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Detection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Detection Summary
          </CardTitle>
          <CardDescription>
            Overview of detection patterns and algorithms used
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Total Patterns Matched</dt>
              <dd className="text-2xl font-bold text-foreground mt-1">{patterns.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Overall Confidence</dt>
              <dd className="text-2xl font-bold text-foreground mt-1">{overallConfidence}%</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground mb-2">Detection Algorithms</dt>
              <dd className="flex flex-wrap gap-2">
                {patternsByType.map(({ type }) => (
                  <Badge key={type} variant="secondary">
                    {formatPatternType(type)}
                  </Badge>
                ))}
              </dd>
            </div>
            {detectionMetadata.lastUpdated && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                <dd className="text-sm text-foreground mt-1">
                  {formatDetectionDate(detectionMetadata.lastUpdated)}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Pattern Breakdown by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Breakdown</CardTitle>
          <CardDescription>
            Detection patterns grouped by algorithm type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patternsByType.map(({ type, count, avgConfidence, severity }) => (
              <div
                key={type}
                className="flex justify-between items-center p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{formatPatternType(type)}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {count} pattern{count !== 1 ? 's' : ''} detected
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{avgConfidence}%</p>
                    <p className="text-xs text-muted-foreground">confidence</p>
                  </div>
                  <Badge
                    variant={getSeverityVariant(severity)}
                    className={getSeverityColorClass(severity)}
                  >
                    {severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Details</CardTitle>
          <CardDescription>
            Detailed information about each detection pattern (showing {startIdx + 1}-{Math.min(endIdx, patterns.length)} of {patterns.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {paginatedPatterns.map((pattern, idx) => {
              const globalIdx = startIdx + idx;
              const isExpanded = expandedPattern === globalIdx;

              return (
                <div
                  key={globalIdx}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* Pattern Summary Row */}
                  <div
                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTogglePattern(globalIdx)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="flex-shrink-0">
                        {formatPatternType(pattern.patternType)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {pattern.metadata?.description || 'Pattern detected'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDetectionDate(pattern.detectedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityVariant(pattern.confidence)}>
                        {pattern.confidence}%
                      </Badge>
                      <Badge
                        variant={getSeverityVariant(pattern.severity)}
                        className={getSeverityColorClass(pattern.severity)}
                      >
                        {pattern.severity}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 bg-muted/30 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 pt-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Evidence</p>
                          <div className="space-y-1">
                            {pattern.evidence.eventCount && (
                              <p className="text-sm text-foreground">
                                <span className="font-medium">Events:</span> {pattern.evidence.eventCount}
                              </p>
                            )}
                            {pattern.evidence.timeWindowMs && (
                              <p className="text-sm text-foreground">
                                <span className="font-medium">Time Window:</span>{' '}
                                {Math.round(pattern.evidence.timeWindowMs / 1000)}s
                              </p>
                            )}
                            {pattern.evidence.automationConfidence && (
                              <p className="text-sm text-foreground">
                                <span className="font-medium">Automation Confidence:</span>{' '}
                                {pattern.evidence.automationConfidence}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Detection Info</p>
                          <div className="space-y-1">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">Type:</span> {formatPatternType(pattern.patternType)}
                            </p>
                            <p className="text-sm text-foreground">
                              <span className="font-medium">Severity:</span> {pattern.severity}
                            </p>
                            <p className="text-sm text-foreground">
                              <span className="font-medium">Confidence:</span> {pattern.confidence}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetectionDetailsTab;
