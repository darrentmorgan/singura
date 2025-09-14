import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFeedbackMetrics } from '@/services/feedbackService';
import { FeedbackEffectivenessReport } from '@saas-xray/shared-types/detection';

export function FeedbackEffectiveness() {
  const [report, setReport] = useState<FeedbackEffectivenessReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeedbackMetrics() {
      try {
        // Retrieve organizationId from context/session
        const orgId = '';
        const metricsData = await getFeedbackMetrics(orgId);
        setReport(metricsData);
      } catch (error) {
        console.error('Failed to load feedback metrics', error);
      } finally {
        setLoading(false);
      }
    }

    loadFeedbackMetrics();
  }, []);

  if (loading) return <div>Loading metrics...</div>;
  if (!report) return <div>No metrics available</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Detection Effectiveness Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3>Total Detections: {report.metrics.totalDetections}</h3>
              <h3>True Positives: {report.metrics.truePositives}</h3>
              <h3>False Positives: {report.metrics.falsePositives}</h3>
              <h3>Accuracy Rate: {(report.metrics.accuracyRate * 100).toFixed(2)}%</h3>
            </div>
            <div>
              <h3>Sensitivity Score: {report.metrics.sensitivityScore.toFixed(2)}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detection Accuracy Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.trends.accuracyOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#8884d8"
                name="Daily Accuracy"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}