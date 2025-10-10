/**
 * Workflow Visualization Component
 * Professional visualization for cross-platform automation chains
 *
 * Business Impact:
 * - Provides executive-ready visual workflow maps for premium tier pricing
 * - Creates unique competitive differentiation through sophisticated chain visualization
 * - Enables customer demonstrations of advanced correlation capabilities
 * - Supports compliance reporting with visual automation documentation
 *
 * Features:
 * - Interactive workflow chain visualization with platform connections
 * - Timeline view showing chronological automation sequences
 * - Risk-based visual highlighting and color coding
 * - Export capabilities for compliance and executive reporting
 * - Touch-optimized design for mobile executive access
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import {
  ArrowRight,
  Clock,
  AlertTriangle,
  Shield,
  Database,
  Globe,
  Download,
  Maximize2,
  Eye
} from 'lucide-react';

import {
  AutomationWorkflowChain,
  WorkflowStage,
  MultiPlatformEvent
} from '@saas-xray/shared-types';

/**
 * Workflow visualization props and configuration
 */
interface WorkflowVisualizationProps {
  chains: AutomationWorkflowChain[];
  selectedChainId?: string;
  onChainSelect?: (chainId: string) => void;
  showTimeline?: boolean;
  showRiskHighlighting?: boolean;
  className?: string;
}

/**
 * Platform styling configuration for consistent visual presentation
 */
const getPlatformStyle = (platform: string) => {
  const styles = {
    slack: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '💬',
      name: 'Slack'
    },
    google: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '📧',
      name: 'Google Workspace'
    },
    microsoft: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '📊',
      name: 'Microsoft 365'
    },
    jira: {
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: '🎯',
      name: 'Jira'
    },
    default: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '🔗',
      name: 'Unknown Platform'
    }
  };

  return styles[platform as keyof typeof styles] || styles.default;
};

/**
 * Risk level styling for visual risk communication
 */
const getRiskStyle = (riskLevel: string) => {
  const styles = {
    critical: { color: 'bg-red-500', text: 'text-red-700', border: 'border-red-300' },
    high: { color: 'bg-red-400', text: 'text-red-600', border: 'border-red-200' },
    medium: { color: 'bg-yellow-400', text: 'text-yellow-700', border: 'border-yellow-300' },
    low: { color: 'bg-green-400', text: 'text-green-700', border: 'border-green-300' },
    default: { color: 'bg-gray-400', text: 'text-gray-700', border: 'border-gray-300' }
  };

  return styles[riskLevel as keyof typeof styles] || styles.default;
};

/**
 * Individual Workflow Chain Visualization Component
 */
const WorkflowChainView: React.FC<{
  chain: AutomationWorkflowChain;
  isSelected: boolean;
  onSelect: () => void;
  showRiskHighlighting: boolean;
}> = ({ chain, isSelected, onSelect, showRiskHighlighting }) => {
  const riskStyle = getRiskStyle(chain.riskLevel);

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-300' : ''
      } ${showRiskHighlighting ? riskStyle.border : ''}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center">
            <span className="mr-2">{chain.platforms.map(p => getPlatformStyle(p).icon).join(' → ')}</span>
            {chain.chainName}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={showRiskHighlighting ? 'destructive' : 'secondary'}>
              {chain.riskLevel.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {chain.correlationConfidence}%
            </Badge>
          </div>
        </div>
        <CardDescription className="text-sm">
          {chain.workflow.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Platform Flow Visualization */}
        <div className="flex items-center space-x-2 mb-4 overflow-x-auto">
          {chain.platforms.map((platform, index) => {
            const platformStyle = getPlatformStyle(platform);
            return (
              <React.Fragment key={platform}>
                <div className={`
                  px-3 py-2 rounded-lg border text-sm font-medium
                  ${platformStyle.color}
                `}>
                  <span className="mr-1">{platformStyle.icon}</span>
                  {platformStyle.name}
                </div>
                {index < chain.platforms.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Workflow Stages */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Workflow Stages:</h4>
          <div className="grid gap-2">
            {chain.workflow.stages.slice(0, 3).map((stage, index) => (
              <div key={stage.stageId} className="flex items-center space-x-2 text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="truncate">{stage.stageName}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {getPlatformStyle(stage.platform).icon}
                </Badge>
              </div>
            ))}
            {chain.workflow.stages.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{chain.workflow.stages.length - 3} more stages
              </div>
            )}
          </div>
        </div>

        {/* Risk Indicators */}
        {showRiskHighlighting && chain.riskAssessment.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Risk Factors:</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {chain.riskAssessment.recommendations.slice(0, 2).join(', ')}
              {chain.riskAssessment.recommendations.length > 2 && '...'}
            </div>
          </div>
        )}

        {/* Automation Details */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Type: {chain.workflow.automation.automationType.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Database className="h-3 w-3" />
              <span>Frequency: {chain.workflow.automation.frequency}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Timeline View Component for Chronological Workflow Analysis
 */
const TimelineView: React.FC<{
  chain: AutomationWorkflowChain;
}> = ({ chain }) => {
  const timelineEvents = useMemo(() => {
    // Combine trigger and action events, sort chronologically
    const allEvents = [chain.triggerEvent, ...chain.actionEvents];
    return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [chain]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Automation Timeline</h3>
        <div className="text-sm text-muted-foreground">
          {timelineEvents.length} events over {
            Math.round((timelineEvents[timelineEvents.length - 1]?.timestamp.getTime() -
                       timelineEvents[0]?.timestamp.getTime()) / 1000)
          } seconds
        </div>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Events */}
        <div className="space-y-6">
          {timelineEvents.map((event, index) => {
            const platformStyle = getPlatformStyle(event.platform);
            const isFirstEvent = index === 0;

            return (
              <div key={event.eventId} className="relative flex items-start space-x-4">
                {/* Timeline Dot */}
                <div className={`
                  relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center
                  ${isFirstEvent ? 'bg-green-100 border-green-300' : 'bg-white border-gray-300'}
                `}>
                  <span className="text-sm">{platformStyle.icon}</span>
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={platformStyle.color}>
                          {platformStyle.name}
                        </Badge>
                        {isFirstEvent && (
                          <Badge variant="outline" className="text-xs">
                            TRIGGER
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium text-sm">
                        {event.actionDetails.action.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.actionDetails.resourceName}
                      </div>

                      {/* Automation Indicators */}
                      {event.correlationMetadata.automationIndicators.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.correlationMetadata.automationIndicators.map((indicator) => (
                            <Badge key={indicator} variant="outline" className="text-xs">
                              {indicator.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Main Workflow Visualization Component
 */
export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  chains,
  selectedChainId,
  onChainSelect,
  showTimeline = true,
  showRiskHighlighting = true,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedChain, setSelectedChain] = useState<AutomationWorkflowChain | null>(null);

  // Handle chain selection
  const handleChainSelect = (chainId: string) => {
    const chain = chains.find(c => c.chainId === chainId);
    setSelectedChain(chain || null);
    setViewMode('detail');
    onChainSelect?.(chainId);
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    return {
      totalChains: chains.length,
      crossPlatformChains: chains.filter(c => c.platforms.length > 1).length,
      highRiskChains: chains.filter(c => ['high', 'critical'].includes(c.riskLevel)).length,
      platforms: [...new Set(chains.flatMap(c => c.platforms))].length
    };
  }, [chains]);

  if (chains.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Globe className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Automation Chains Found</h3>
            <p>No cross-platform automation workflows were detected in the current analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Summary Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Workflow Visualization</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'detail' : 'grid')}
              >
                {viewMode === 'grid' ? <Eye className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {viewMode === 'grid' ? 'Detail View' : 'Grid View'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Interactive visualization of detected automation chains across platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.totalChains}</div>
              <div className="text-sm text-muted-foreground">Total Chains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{summaryStats.crossPlatformChains}</div>
              <div className="text-sm text-muted-foreground">Cross-Platform</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summaryStats.highRiskChains}</div>
              <div className="text-sm text-muted-foreground">High Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summaryStats.platforms}</div>
              <div className="text-sm text-muted-foreground">Platforms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {viewMode === 'grid' ? (
        /* Grid View - All Chains */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chains.map((chain) => (
            <WorkflowChainView
              key={chain.chainId}
              chain={chain}
              isSelected={chain.chainId === selectedChainId}
              onSelect={() => handleChainSelect(chain.chainId)}
              showRiskHighlighting={showRiskHighlighting}
            />
          ))}
        </div>
      ) : (
        /* Detail View - Selected Chain */
        selectedChain && (
          <div className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setViewMode('grid')}
              className="mb-4"
            >
              ← Back to Grid View
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedChain.chainName}</span>
                  <Badge variant={getRiskStyle(selectedChain.riskLevel).text.includes('red') ? 'destructive' : 'secondary'}>
                    {selectedChain.riskLevel.toUpperCase()} RISK
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Detailed analysis of automation workflow chain across {selectedChain.platforms.length} platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
                    <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <WorkflowChainView
                      chain={selectedChain}
                      isSelected={true}
                      onSelect={() => {}}
                      showRiskHighlighting={showRiskHighlighting}
                    />
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    {showTimeline && <TimelineView chain={selectedChain} />}
                  </TabsContent>

                  <TabsContent value="dataflow" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Data Flow Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Source Data Types</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedChain.workflow.dataFlow.sourceDataType.map((type) => (
                                <Badge key={type} variant="outline">{type}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Destination Platforms</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedChain.workflow.dataFlow.destinationPlatforms.map((platform) => {
                                const style = getPlatformStyle(platform);
                                return (
                                  <Badge key={platform} className={style.color}>
                                    {style.icon} {style.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Sensitivity Classification</h4>
                            <Badge variant={
                              selectedChain.workflow.dataFlow.sensitivityClassification.overallSensitivity === 'restricted' ? 'destructive' :
                              selectedChain.workflow.dataFlow.sensitivityClassification.overallSensitivity === 'confidential' ? 'secondary' :
                              'outline'
                            }>
                              {selectedChain.workflow.dataFlow.sensitivityClassification.overallSensitivity.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="risk" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Risk Assessment Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Data Exposure</div>
                              <div className="text-lg font-bold">{selectedChain.riskAssessment.dataExposure.riskScore}/100</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Compliance Impact</div>
                              <div className="text-lg font-bold">{selectedChain.riskAssessment.complianceImpact.overallComplianceRisk.replace(/_/g, ' ').toUpperCase()}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Business Impact</div>
                              <div className="text-lg font-bold">{selectedChain.riskAssessment.businessImpact.impactLevel.toUpperCase()}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Overall Risk</div>
                              <div className="text-lg font-bold">{selectedChain.riskAssessment.overallRisk.toUpperCase()}</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Recommendations</h4>
                            <ul className="space-y-1">
                              {selectedChain.riskAssessment.recommendations.map((rec, index) => (
                                <li key={index} className="text-sm flex items-start">
                                  <Shield className="mr-2 h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
};