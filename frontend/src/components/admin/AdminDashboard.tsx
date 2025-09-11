import React, { useState, useEffect } from 'react';
import { 
  AdminDashboardDataResponse, 
  AdminScanEvent, 
  AdminDetectionResult,
  AlgorithmPerformanceMetrics,
  AdminSystemHealth
} from '@saas-xray/shared-types';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/admin/dashboard-data');
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualScan = async (platform: string) => {
    try {
      await axios.post('/api/admin/manual-scan', { 
        platform, 
        connectionId: `manual-scan-${Date.now()}` 
      });
      // Refresh dashboard data after manual scan trigger
      fetchDashboardData();
    } catch (err) {
      setError('Failed to trigger manual scan');
      console.error(err);
    }
  };

  if (isLoading) return <div>Loading admin dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboardData) return null;

  return (
    <div className="admin-dashboard p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <Tabs defaultValue="live-scans">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live-scans">Live Scans</TabsTrigger>
          <TabsTrigger value="detections">Detections</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system-health">System Health</TabsTrigger>
        </TabsList>

        {/* Live Scans Tab */}
        <TabsContent value="live-scans">
          <Card>
            <CardHeader>
              <CardTitle>Live Scan Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.scanEvents.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell>{event.timestamp.toLocaleString()}</TableCell>
                      <TableCell>{event.platform}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            event.status === 'completed' ? 'default' :
                            event.status === 'error' ? 'destructive' :
                            'outline'
                          }
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detections Tab */}
        <TabsContent value="detections">
          <Card>
            <CardHeader>
              <CardTitle>Detection Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Risk Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.detectionResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.timestamp.toLocaleString()}</TableCell>
                      <TableCell>{result.platform}</TableCell>
                      <TableCell>{result.algorithm}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            result.confidence > 0.7 ? 'default' :
                            result.confidence > 0.3 ? 'outline' :
                            'destructive'
                          }
                        >
                          {(result.confidence * 100).toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{result.riskScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Total Scans</TableHead>
                    <TableHead>Detections</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Avg Processing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.performanceMetrics.map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell>{metric.algorithmName}</TableCell>
                      <TableCell>{metric.totalScans}</TableCell>
                      <TableCell>{metric.detectionsFound}</TableCell>
                      <TableCell>
                        {(metric.accuracyRate * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        {metric.averageProcessingTime.toFixed(2)}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system-health">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>OAuth Connections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.entries(dashboardData.systemHealth.oauthConnections).map(([platform, connection]) => (
                      <div key={platform} className="mb-2">
                        <div className="flex justify-between">
                          <span>{platform}</span>
                          <Badge 
                            variant={
                              connection.status === 'active' ? 'default' :
                              connection.status === 'expired' ? 'outline' :
                              'destructive'
                            }
                          >
                            {connection.status}
                          </Badge>
                        </div>
                        {connection.lastSuccessfulSync && (
                          <p className="text-sm text-muted-foreground">
                            Last Sync: {connection.lastSuccessfulSync.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Load</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>CPU Usage</span>
                        <Badge variant="outline">
                          {dashboardData.systemHealth.systemLoadMetrics.cpuUsage}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory Usage</span>
                        <Badge variant="outline">
                          {dashboardData.systemHealth.systemLoadMetrics.memoryUsage}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Detection Jobs</span>
                        <Badge variant="outline">
                          {dashboardData.systemHealth.systemLoadMetrics.activeDetectionJobs}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex space-x-2">
        <Button onClick={() => triggerManualScan('google')}>
          Trigger Google Scan
        </Button>
        <Button onClick={() => triggerManualScan('slack')}>
          Trigger Slack Scan
        </Button>
        <Button onClick={fetchDashboardData} variant="outline">
          Refresh Dashboard
        </Button>
      </div>
    </div>
  );
};