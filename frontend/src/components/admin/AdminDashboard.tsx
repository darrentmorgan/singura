import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

interface DiscoveryEventCard {
  id: string;
  eventId: string;
  discoveryId: string;
  connectionId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  triggeredAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  isExpanded: boolean;
  summary: {
    automationsFound: number;
    overallRiskScore: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    aiIntegrationsDetected: number;
    complianceViolations: string[];
    processingTimeMs: number;
    algorithmsExecuted: string[];
  };
  detailedResults: AutomationDetectionDetail[];
  performance: {
    totalProcessingTime: number;
    efficiency: {
      eventsPerSecond: number;
      accuracyRate: number;
      apiCallsPerSecond: number;
    };
    resourceUtilization: {
      cpuUsage: number;
      memoryPeak: number;
      apiQuotaUsed: number;
    };
  };
}

interface AutomationDetectionDetail {
  automationId: string;
  name: string;
  type: 'bot' | 'workflow' | 'integration' | 'webhook' | 'script';
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  confidence: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  aiIntegration?: {
    provider: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'google' | 'unknown';
    apiEndpoints: string[];
    dataTypesProcessed: string[];
    estimatedDataVolume: 'low' | 'medium' | 'high' | 'massive';
    lastActivity: Date;
  };
  complianceAnalysis: {
    violations: ComplianceViolationDetail[];
    regulationsAffected: ('GDPR' | 'SOX' | 'HIPAA' | 'PCI' | 'CCPA')[];
    businessImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
    recommendedActions: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'immediate';
  };
  technicalDetails: {
    detectionMethod: string;
    algorithmsUsed: string[];
    evidenceFactors: string[];
    correlatedEvents: number;
    detectionTimestamp: Date;
  };
  automationMetadata: {
    description: string;
    triggers: string[];
    actions: string[];
    permissions: string[];
    createdDate?: Date;
    lastModified?: Date;
    lastTriggered?: Date;
    executionFrequency?: string;
  };
}

interface ComplianceViolationDetail {
  violationType: string;
  regulation: 'GDPR' | 'SOX' | 'HIPAA' | 'PCI' | 'CCPA';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataTypesAffected: string[];
  potentialFineRange?: {
    min: number;
    max: number;
    currency: string;
  };
  remediationSteps: string[];
}

export const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [discoveryEvents, setDiscoveryEvents] = useState<DiscoveryEventCard[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [mode, setMode] = useState<'mock' | 'live' | 'hybrid'>('hybrid');
  const [activeTab, setActiveTab] = useState<'terminal' | 'events'>('terminal');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Connect to Socket.io for real discovery events
  useEffect(() => {
    // Create Socket.io connection for admin events
    const socket = new WebSocket('ws://localhost:4201/socket.io/?EIO=4&transport=websocket');
    
    socket.onopen = () => {
      console.log('Admin terminal connected to Socket.io for live discovery events');
      // Add connection event to logs
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: '🔌 ADMIN: Connected to live discovery event stream',
        details: { mode: 'hybrid' }
      }]);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'admin:discovery_event') {
          // Add real discovery event to logs
          const realEvent: LogEntry = {
            timestamp: data.data.timestamp ? new Date(data.data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
            level: data.data.level || 'info',
            message: data.data.message || 'Unknown discovery event',
            details: data.data.executionDetails || data.data.detectionResult
          };
          
          setLogs(prev => [...prev.slice(-19), realEvent]); // Keep last 20 logs including real events
          
          // Check if this is a discovery completion event and create persistent card
          if (data.data.stage === 'completed' && data.data.discoveryId) {
            createDiscoveryEventCard(data.data);
          }
        }
      } catch (error) {
        console.error('Error parsing admin Socket.io message:', error);
      }
    };

    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, []);

  // Simulate live logging data for hybrid mode
  useEffect(() => {
    if (mode !== 'live') { // Only run mock data if not in live-only mode
    const generateMockLogs = () => {
      const mockLogMessages = [
        { level: 'info' as const, message: '🔍 Starting Google Workspace scan for conn-google-1757568554564' },
        { level: 'info' as const, message: '📊 Fetching audit logs: 2025-09-10 to 2025-09-11' },
        { level: 'success' as const, message: '⚡ VelocityDetector: Analyzing 247 events' },
        { level: 'info' as const, message: '🤖 AIProviderDetector: Scanning for AI endpoints' },
        { level: 'warning' as const, message: '⚠️  Found OpenAI API calls in Google Apps Script' },
        { level: 'success' as const, message: '✅ Detection: 94.5% confidence ChatGPT integration detected' },
        { level: 'info' as const, message: '📈 Risk Score: 85/100 (HIGH) - Customer data exposure' },
        { level: 'warning' as const, message: '🚨 GDPR Violation: PII data sent to external AI service' },
        { level: 'success' as const, message: '✅ Cross-platform correlation: Slack → Google workflow detected' },
        { level: 'info' as const, message: '📊 Algorithm performance: 2.3s processing, 94% accuracy' },
        { level: 'success' as const, message: '🎯 Detection complete: 3 automations found, 2 high-risk' },
        { level: 'info' as const, message: '💾 OAuth tokens refreshed for conn-slack-1757556120267' },
        { level: 'warning' as const, message: '⏰ Off-hours activity detected: Weekend automation at 02:30 AM' },
        { level: 'success' as const, message: '🔗 Batch operation detected: 50 files processed in 30 seconds' }
      ];

      const addRandomLog = () => {
        const randomMessage = mockLogMessages[Math.floor(Math.random() * mockLogMessages.length)];
        const newLog: LogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          level: randomMessage.level,
          message: randomMessage.message,
          details: randomMessage.level === 'success' ? { confidence: Math.floor(Math.random() * 30) + 70 } : undefined
        };

        setLogs(prevLogs => [...prevLogs.slice(-20), newLog]); // Keep last 20 logs
      };

      // Add initial logs
      addRandomLog();
      
      // Add new logs every 2-4 seconds
      const interval = setInterval(() => {
        addRandomLog();
      }, Math.random() * 2000 + 2000);

      return () => clearInterval(interval);
    };

    generateMockLogs();
    }
  }, [mode]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-300';
    }
  };

  // Removed unused getLevelBadge function - using getLevelColor instead

  const clearLogs = () => {
    setLogs([]);
  };

  // Create static discovery event card from completed discovery
  const createDiscoveryEventCard = (discoveryData: Record<string, unknown>) => {
    const mockAutomationDetails: AutomationDetectionDetail[] = [
      {
        automationId: `auto-${Date.now()}-1`,
        name: 'ChatGPT Google Apps Script Integration',
        type: 'integration',
        platform: (discoveryData.platform as 'slack' | 'google' | 'microsoft' | 'jira') || 'google',
        confidence: 94.5,
        riskScore: 85,
        riskLevel: 'high',
        aiIntegration: {
          provider: 'openai',
          apiEndpoints: ['https://api.openai.com/v1/chat/completions'],
          dataTypesProcessed: ['email_content', 'spreadsheet_data', 'customer_info'],
          estimatedDataVolume: 'high',
          lastActivity: new Date()
        },
        complianceAnalysis: {
          violations: [
            {
              violationType: 'Unauthorized Data Transfer',
              regulation: 'GDPR',
              description: 'Customer PII data sent to external AI service without consent',
              severity: 'high',
              dataTypesAffected: ['email_addresses', 'customer_names', 'financial_data'],
              potentialFineRange: { min: 10000, max: 50000, currency: 'EUR' },
              remediationSteps: ['Implement data classification', 'Add consent mechanisms', 'Audit data flows']
            }
          ],
          regulationsAffected: ['GDPR'],
          businessImpact: 'significant',
          recommendedActions: ['Immediate review of data handling', 'Implement approval workflow', 'Add audit logging'],
          urgencyLevel: 'high'
        },
        technicalDetails: {
          detectionMethod: 'API Pattern Analysis',
          algorithmsUsed: ['AIProviderDetector', 'VelocityDetector'],
          evidenceFactors: ['OpenAI API calls', 'High data velocity', 'Off-hours activity'],
          correlatedEvents: 15,
          detectionTimestamp: new Date()
        },
        automationMetadata: {
          description: 'Google Apps Script that processes emails and sends content to ChatGPT for analysis',
          triggers: ['new_email_received', 'manual_execution'],
          actions: ['read_email_content', 'call_openai_api', 'update_spreadsheet'],
          permissions: ['gmail.modify', 'sheets.write', 'script.external_request'],
          createdDate: new Date('2024-12-15'),
          lastModified: new Date(),
          lastTriggered: new Date(),
          executionFrequency: '~50 times/day'
        }
      }
    ];

    const newDiscoveryEvent: DiscoveryEventCard = {
      id: `discovery-${Date.now()}`,
      eventId: `event-${Date.now()}`,
      discoveryId: String(discoveryData.discoveryId || ''),
      connectionId: String(discoveryData.connectionId || ''),
      platform: (discoveryData.platform as 'slack' | 'google' | 'microsoft' | 'jira') || 'google',
      triggeredAt: new Date(),
      completedAt: new Date(),
      status: 'completed',
      isExpanded: false,
      summary: {
        automationsFound: mockAutomationDetails.length,
        overallRiskScore: 85,
        highRiskCount: 1,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        aiIntegrationsDetected: 1,
        complianceViolations: ['GDPR Data Transfer'],
        processingTimeMs: 2300,
        algorithmsExecuted: ['AIProviderDetector', 'VelocityDetector', 'BatchOperationDetector']
      },
      detailedResults: mockAutomationDetails,
      performance: {
        totalProcessingTime: 2300,
        efficiency: {
          eventsPerSecond: 107,
          apiCallsPerSecond: 0.4,
          accuracyRate: 94.5
        },
        resourceUtilization: {
          cpuUsage: 23,
          memoryPeak: 67.8,
          apiQuotaUsed: 12
        }
      }
    };

    setDiscoveryEvents(prev => [newDiscoveryEvent, ...prev.slice(0, 9)]); // Keep last 10 discovery events
  };

  const toggleEventExpansion = (eventId: string) => {
    setDiscoveryEvents(prev => 
      prev.map(event => 
        event.id === eventId 
          ? { ...event, isExpanded: !event.isExpanded }
          : event
      )
    );
  };

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high' | 'critical') => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Dual Interface Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">🔍 Admin Detection Dashboard</h2>
          <Badge className="bg-green-600">ONLINE</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as 'mock' | 'live' | 'hybrid')}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="mock">Mock Data</option>
            <option value="live">Live Only</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAutoScroll(!isAutoScroll)}
          >
            {isAutoScroll ? '⏸️ Pause Scroll' : '▶️ Auto Scroll'}
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            🗑️ Clear
          </Button>
        </div>
      </div>

      {/* Dual Interface Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'terminal' | 'events')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="terminal" className="flex items-center space-x-2">
            <span>💻</span>
            <span>Live Terminal</span>
            <Badge variant="outline" className="ml-2">{logs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <span>📋</span>
            <span>Discovery Events</span>
            <Badge variant="outline" className="ml-2">{discoveryEvents.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terminal" className="flex-1 flex flex-col space-y-4">

          {/* Live Logging Terminal */}
          <Card className="flex-1 bg-black text-white font-mono text-sm overflow-hidden">
            <CardContent className="p-0 h-full">
              <div className="h-full overflow-auto p-4 space-y-1 terminal-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-gray-500 italic">
                    📡 Waiting for detection events... Run a discovery to see live logging.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-3 min-w-0 py-0.5 hover:bg-gray-900/30 px-2 -mx-2 rounded">
                      <span className="text-gray-500 text-xs shrink-0 w-20 select-none font-medium">
                        {log.timestamp}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`${getLevelColor(log.level)} break-words whitespace-pre-wrap leading-relaxed`}>
                          {log.message}
                        </div>
                        {log.details && (
                          <div className="text-xs text-gray-400 mt-1 break-words leading-relaxed">
                            📊 Details: {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Terminal Stats Footer */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <Card className="p-2">
              <div className="text-xs text-gray-600">Total Events</div>
              <div className="text-sm font-semibold">{logs.length}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-gray-600">Detections</div>
              <div className="text-sm font-semibold text-green-600">
                {logs.filter(l => l.level === 'success').length}
              </div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-gray-600">Warnings</div>
              <div className="text-sm font-semibold text-yellow-600">
                {logs.filter(l => l.level === 'warning').length}
              </div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-gray-600">Uptime</div>
              <div className="text-sm font-semibold text-blue-600">99.8%</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="flex-1 flex flex-col">
          {/* Static Discovery Event Cards */}
          <div className="flex-1 overflow-auto space-y-4">
            {discoveryEvents.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500 text-lg mb-2">📋</div>
                <div className="text-gray-600 font-medium mb-1">No Discovery Events Yet</div>
                <div className="text-sm text-gray-500">
                  Run a discovery scan to generate detailed automation reports
                </div>
              </Card>
            ) : (
              discoveryEvents.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">
                          {event.platform === 'google' ? '🟢' : event.platform === 'slack' ? '🟣' : '🔵'}
                        </div>
                        <div>
                          <CardTitle className="text-lg capitalize">
                            {event.platform} Discovery Scan
                          </CardTitle>
                          <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                            <span>📅 {event.triggeredAt.toLocaleString()}</span>
                            <span>⏱️ {event.performance.totalProcessingTime}ms</span>
                            <Badge 
                              className={event.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                            >
                              {event.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleEventExpansion(event.id)}
                      >
                        {event.isExpanded ? '🔽 Collapse' : '🔼 Expand'}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">{event.summary.automationsFound}</div>
                        <div className="text-xs text-gray-600">Automations</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="text-2xl font-bold text-red-600">{event.summary.highRiskCount}</div>
                        <div className="text-xs text-gray-600">High Risk</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-2xl font-bold text-purple-600">{event.summary.aiIntegrationsDetected}</div>
                        <div className="text-xs text-gray-600">AI Integrations</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="text-2xl font-bold text-orange-600">{event.summary.overallRiskScore}</div>
                        <div className="text-xs text-gray-600">Risk Score</div>
                      </div>
                    </div>

                    {event.isExpanded && (
                      <div className="space-y-6 border-t pt-4">
                        {/* Detailed Automation Results */}
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            🤖 Detected Automations ({event.detailedResults.length})
                          </h4>
                          <div className="space-y-3">
                            {event.detailedResults.map((automation) => (
                              <Card key={automation.automationId} className="p-4 bg-gray-50">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h5 className="font-medium text-gray-800">{automation.name}</h5>
                                    <div className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                                      <Badge variant="outline" className="text-xs">{automation.type}</Badge>
                                      <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(automation.riskLevel)}`}>
                                        {automation.riskLevel.toUpperCase()} RISK
                                      </span>
                                      <span>🎯 {automation.confidence}% confidence</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-red-600">{automation.riskScore}/100</div>
                                    <div className="text-xs text-gray-500">Risk Score</div>
                                  </div>
                                </div>

                                {automation.aiIntegration && (
                                  <div className="mb-3 p-3 bg-purple-50 rounded border">
                                    <div className="font-medium text-purple-800 text-sm mb-2">🧠 AI Integration Detected</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                                      <div><strong>Provider:</strong> {automation.aiIntegration.provider}</div>
                                      <div><strong>Data Volume:</strong> {automation.aiIntegration.estimatedDataVolume}</div>
                                      <div><strong>Last Activity:</strong> {automation.aiIntegration.lastActivity.toLocaleString()}</div>
                                      <div><strong>Data Types:</strong> {automation.aiIntegration.dataTypesProcessed.join(', ')}</div>
                                    </div>
                                  </div>
                                )}

                                {automation.complianceAnalysis.violations.length > 0 && (
                                  <div className="p-3 bg-red-50 rounded border border-red-200">
                                    <div className="font-medium text-red-800 text-sm mb-2">⚠️ Compliance Violations</div>
                                    {automation.complianceAnalysis.violations.map((violation, vIdx) => (
                                      <div key={vIdx} className="text-xs text-red-700 mb-1">
                                        <strong>{violation.regulation}:</strong> {violation.description}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-3 pt-2 border-t text-xs text-gray-600">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div><strong>Detection Method:</strong> {automation.technicalDetails.detectionMethod}</div>
                                    <div><strong>Evidence Factors:</strong> {automation.technicalDetails.evidenceFactors.length}</div>
                                    <div><strong>Correlated Events:</strong> {automation.technicalDetails.correlatedEvents}</div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            📊 Performance Metrics
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="p-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Processing Efficiency</div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div>Events/second: {event.performance.efficiency.eventsPerSecond}</div>
                                <div>Accuracy: {event.performance.efficiency.accuracyRate}%</div>
                                <div>API Calls/second: {event.performance.efficiency.apiCallsPerSecond}</div>
                              </div>
                            </Card>
                            <Card className="p-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Resource Usage</div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div>CPU: {event.performance.resourceUtilization.cpuUsage}%</div>
                                <div>Memory Peak: {event.performance.resourceUtilization.memoryPeak}MB</div>
                                <div>API Quota: {event.performance.resourceUtilization.apiQuotaUsed}%</div>
                              </div>
                            </Card>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};