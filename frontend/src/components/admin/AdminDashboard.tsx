import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [mode, setMode] = useState<'mock' | 'live' | 'hybrid'>('hybrid');
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

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">🔍 Live Detection Terminal</h2>
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

      {/* Stats Footer */}
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
    </div>
  );
};