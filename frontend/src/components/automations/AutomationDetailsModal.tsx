/**
 * Automation Details Modal Component
 * Displays comprehensive information about a selected automation with enriched OAuth permissions
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Workflow,
  Webhook,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  User,
  Calendar,
  Activity,
  Lock,
  RefreshCw,
  Info
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AutomationDiscovery } from '@/types/api';
import { cn } from '@/lib/utils';
import { automationsApi } from '@/services/api';

// Automation type icons
const automationTypeIcons = {
  bot: Bot,
  workflow: Workflow,
  integration: Zap,
  webhook: Webhook,
  app: Zap,
};

// Status colors
const statusColors = {
  active: 'text-green-600',
  inactive: 'text-gray-600',
  error: 'text-red-600',
  unknown: 'text-yellow-600',
};

interface AutomationDetailsModalProps {
  automation: AutomationDiscovery;
  isOpen: boolean;
  onClose: () => void;
  onAssessRisk?: (automationId: string) => void;
}

export const AutomationDetailsModal: React.FC<AutomationDetailsModalProps> = ({
  automation,
  isOpen,
  onClose,
  onAssessRisk
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [detailedData, setDetailedData] = useState<any>(null);

  const TypeIcon = automationTypeIcons[automation.type] || Bot;

  useEffect(() => {
    if (isOpen && automation.id) {
      fetchDetailedData();
    }
  }, [isOpen, automation.id]);

  const fetchDetailedData = async () => {
    setIsLoading(true);
    try {
      const response = await automationsApi.getAutomationDetails(automation.id);
      if (response.success && (response as any).automation) {
        setDetailedData((response as any).automation);
      }
    } catch (error) {
      console.error('Failed to fetch automation details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessRisk = async () => {
    if (!onAssessRisk) return;
    
    setIsLoading(true);
    try {
      await onAssessRisk(automation.id);
      await fetchDetailedData(); // Refresh data after risk assessment
    } catch (error) {
      console.error('Risk assessment failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (automation.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRiskBadgeClass = (riskLevel?: string | null) => {
    if (!riskLevel) {
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
    }

    switch (riskLevel.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-background border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <TypeIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{automation.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-muted-foreground capitalize">{automation.platform}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground capitalize">{automation.type}</span>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon()}
                  <span className={cn('text-sm font-medium capitalize', statusColors[automation.status])}>
                    {automation.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssessRisk}
              disabled={isLoading || !onAssessRisk}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Assess Risk
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="permissions" className="w-full">
          <div className="border-b px-6">
            <TabsList className="h-auto bg-transparent p-0">
              <TabsTrigger value="permissions" className="px-4 py-3">
                Permissions {detailedData?.permissions?.total ? `(${detailedData.permissions.total})` : ''}
              </TabsTrigger>
              <TabsTrigger value="risk" className="px-4 py-3">
                Risk Analysis
              </TabsTrigger>
              <TabsTrigger value="details" className="px-4 py-3">
                Details
              </TabsTrigger>
            </TabsList>
          </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading enriched permission details...</span>
            </div>
          ) : (
            <>
              {/* Permissions Tab */}
              <TabsContent value="permissions" className="mt-0 space-y-6">
                {detailedData?.permissions ? (
                  <>
                    {/* Overall Risk Summary */}
                    {detailedData.permissions.riskAnalysis && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Permission Risk Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <Badge className={getRiskBadgeClass(detailedData.permissions.riskAnalysis.riskLevel)}>
                              {detailedData.permissions.riskAnalysis.riskLevel || 'Unknown'}
                            </Badge>
                            <span className="text-sm">
                              Overall Risk Score: <span className="font-bold">{detailedData.permissions.riskAnalysis.overallRisk}/100</span>
                            </span>
                          </div>

                          {detailedData.permissions.riskAnalysis.highestRisk && (
                            <Alert variant="destructive" className="mt-4">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Highest Risk Permission</AlertTitle>
                              <AlertDescription>
                                {detailedData.permissions.riskAnalysis.highestRisk.scope} (Risk: {detailedData.permissions.riskAnalysis.highestRisk.score}/100)
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Individual Scope Cards */}
                    <div className="space-y-4">
                      {detailedData.permissions.enriched && detailedData.permissions.enriched.length > 0 ? (
                        detailedData.permissions.enriched.map((scope: any, index: number) => (
                          <Card key={index}>
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{scope.displayName}</CardTitle>
                                  <CardDescription className="mt-1">
                                    {scope.serviceName} • {scope.accessLevel}
                                  </CardDescription>
                                </div>
                                <Badge className={getRiskBadgeClass(scope.riskLevel)}>
                                  {scope.riskScore || 0}/100 {scope.riskLevel || 'Unknown'}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {scope.description}
                              </p>

                              {/* Data Types */}
                              {scope.dataTypes && scope.dataTypes.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Data Access:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {scope.dataTypes.map((type: string, i: number) => (
                                      <Badge key={i} variant="outline">{type}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* GDPR Impact */}
                              {scope.gdprImpact && (
                                <Alert variant="warning">
                                  <Shield className="h-4 w-4" />
                                  <AlertTitle>GDPR Impact</AlertTitle>
                                  <AlertDescription className="text-sm">
                                    {scope.gdprImpact}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Alternatives */}
                              {scope.alternatives && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    Recommended Alternative:
                                  </h4>
                                  <p className="text-sm">{scope.alternatives}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No enriched permission data available</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No permission data available</p>
                  </div>
                )}
              </TabsContent>

              {/* Risk Analysis Tab */}
              <TabsContent value="risk" className="mt-0 space-y-6">
                {detailedData?.metadata?.isAIPlatform && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>AI Platform Detected</AlertTitle>
                    <AlertDescription>
                      {detailedData.metadata.platformName} integration detected.
                      This automation sends your organization's data to external AI services.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Risk Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Factors ({detailedData?.metadata?.riskFactors?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailedData?.metadata?.riskFactors && detailedData.metadata.riskFactors.length > 0 ? (
                      <ul className="space-y-2">
                        {detailedData.metadata.riskFactors.map((factor: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific risk factors identified</p>
                    )}
                  </CardContent>
                </Card>

                {/* Permission Risk Breakdown */}
                {detailedData?.permissions?.riskAnalysis?.breakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Permission Risk Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {detailedData.permissions.riskAnalysis.breakdown.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.scope}</p>
                              <p className="text-xs text-muted-foreground">Contribution: {item.contribution}%</p>
                            </div>
                            <Badge className={getRiskBadgeClass(item.riskScore > 70 ? 'high' : item.riskScore > 40 ? 'medium' : 'low')}>
                              {item.riskScore}/100
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {detailedData?.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="text-sm text-foreground mt-1">{detailedData.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {detailedData?.authorizedBy && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Authorized By</p>
                            <p className="text-sm font-medium text-foreground">{detailedData.authorizedBy}</p>
                          </div>
                        </div>
                      )}

                      {detailedData?.createdAt && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm font-medium text-foreground">{formatDate(detailedData.createdAt)}</p>
                          </div>
                        </div>
                      )}

                      {detailedData?.lastActivity && (
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Last Activity</p>
                            <p className="text-sm font-medium text-foreground">{detailedData.lastActivity}</p>
                          </div>
                        </div>
                      )}

                      {detailedData?.authorizationAge && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Authorization Age</p>
                            <p className="text-sm font-medium text-foreground">{detailedData.authorizationAge}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Connection Info */}
                {detailedData?.connection && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Connection Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Platform</p>
                          <p className="text-sm font-medium capitalize">{detailedData.connection.platform}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Display Name</p>
                          <p className="text-sm font-medium">{detailedData.connection.displayName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant={detailedData.connection.status === 'active' ? 'default' : 'secondary'}>
                            {detailedData.connection.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                {detailedData?.metadata && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detailedData.metadata.platformName && (
                        <div>
                          <p className="text-xs text-muted-foreground">Platform Name</p>
                          <p className="text-sm font-medium">{detailedData.metadata.platformName}</p>
                        </div>
                      )}
                      {detailedData.metadata.clientId && (
                        <div>
                          <p className="text-xs text-muted-foreground">Client ID</p>
                          <p className="text-sm font-mono">{detailedData.metadata.clientId}</p>
                        </div>
                      )}
                      {detailedData.metadata.detectionMethod && (
                        <div>
                          <p className="text-xs text-muted-foreground">Detection Method</p>
                          <p className="text-sm">{detailedData.metadata.detectionMethod}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </>
          )}
        </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AutomationDetailsModal;