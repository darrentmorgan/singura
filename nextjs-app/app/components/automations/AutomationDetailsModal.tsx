/**
 * Automation Details Modal Component
 * Displays comprehensive information about a selected automation
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
  BarChart3,
  Lock,
  Unlock,
  FileText,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AutomationDiscovery, RiskLevel } from '@/types/api';
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

// Risk level colors
const riskColors = {
  low: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  high: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
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
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'permissions' | 'activity'>('overview');

  const TypeIcon = automationTypeIcons[automation.type] || Bot;

  useEffect(() => {
    if (isOpen && automation.id) {
      fetchDetailedData();
    }
  }, [isOpen, automation.id]);

  const fetchDetailedData = async () => {
    setIsLoading(true);
    try {
      const response = await automationsApi.getAutomation(automation.id);
      if (response.success && response.data) {
        setDetailedData(response.data);
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

  const getRiskIcon = () => {
    switch (automation.riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  const data = detailedData || automation;

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
        <div className="flex border-b">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'risk', label: 'Risk Analysis' },
            { key: 'permissions', label: 'Permissions' },
            { key: 'activity', label: 'Activity' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading details...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Basic Information</h3>
                      
                      {automation.description && (
                        <div>
                          <label className="text-sm text-muted-foreground">Description</label>
                          <p className="text-sm text-foreground mt-1">{automation.description}</p>
                        </div>
                      )}
                      
                      {automation.createdBy && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Created by</span>
                          <span className="text-sm font-medium text-foreground">{automation.createdBy}</span>
                        </div>
                      )}
                      
                      {automation.createdAt && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Created</span>
                          <span className="text-sm font-medium text-foreground">{formatDate(automation.createdAt)}</span>
                        </div>
                      )}
                      
                      {automation.lastTriggered && (
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Last triggered</span>
                          <span className="text-sm font-medium text-foreground">{formatDate(automation.lastTriggered)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">Risk Assessment</h3>
                      
                      <div>
                        <label className="text-sm text-muted-foreground">Risk Level</label>
                        <div className="mt-1">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                            riskColors[automation.riskLevel]
                          )}>
                            {getRiskIcon()}
                            <span className="ml-2 capitalize">{automation.riskLevel} Risk</span>
                          </span>
                        </div>
                      </div>
                      
                      {data.metadata?.riskScore && (
                        <div>
                          <label className="text-sm text-muted-foreground">Risk Score</label>
                          <div className="mt-1 flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-lg font-semibold text-foreground">{data.metadata.riskScore}/100</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Triggers and Actions */}
                  {(data.metadata?.triggers?.length > 0 || data.metadata?.actions?.length > 0) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Configuration</h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        {data.metadata?.triggers?.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground">Triggers</label>
                            <div className="mt-1 space-y-1">
                              {data.metadata.triggers.map((trigger: string, index: number) => (
                                <span key={index} className="inline-block px-2 py-1 bg-muted rounded text-xs font-medium">
                                  {trigger}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {data.metadata?.actions?.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground">Actions</label>
                            <div className="mt-1 space-y-1">
                              {data.metadata.actions.map((action: string, index: number) => (
                                <span key={index} className="inline-block px-2 py-1 bg-muted rounded text-xs font-medium">
                                  {action}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Risk Analysis Tab */}
              {activeTab === 'risk' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Risk Factors</h3>
                      {data.metadata?.riskFactors?.length > 0 ? (
                        <div className="space-y-2">
                          {data.metadata.riskFactors.map((factor: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-foreground">{factor}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No specific risk factors identified</p>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Recommendations</h3>
                      {data.metadata?.recommendations?.length > 0 ? (
                        <div className="space-y-2">
                          {data.metadata.recommendations.map((rec: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-foreground">{rec}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No recommendations available</p>
                      )}
                    </div>
                  </div>

                  {/* Detailed Risk Scores */}
                  {data.metadata?.detailedRiskScores && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Risk Score Breakdown</h3>
                      <div className="grid gap-4 md:grid-cols-4">
                        {Object.entries(data.metadata.detailedRiskScores).map(([category, score]) => (
                          <div key={category} className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-foreground">{score || 0}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {category.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compliance Issues */}
                  {data.metadata?.complianceIssues?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Compliance Issues</h3>
                      <div className="space-y-2">
                        {data.metadata.complianceIssues.map((issue: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2">
                            <FileText className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-foreground">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Permissions Tab */}
              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Required Permissions</h3>
                  {automation.permissions && automation.permissions.length > 0 ? (
                    <div className="space-y-2">
                      {automation.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono text-foreground">{permission}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific permissions documented</p>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Recent Activity</h3>
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Activity tracking will be available in a future update</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationDetailsModal;