import { Request, Response } from 'express';
import { 
  AdminDashboardDataRequest, 
  AdminDashboardDataResponse 
} from '@singura/shared-types';
import { detectionService } from '../services/detection-service';
import '../types/express'; // Import express augmentation

export class AdminDashboardController {
  /**
   * Get admin dashboard data
   * Only accessible to admin users
   */
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is an admin (authentication middleware would handle this)
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ 
          error: 'Unauthorized access. Admin rights required.' 
        });
        return;
      }

      // Parse request parameters with defaults
      const dashboardRequest: AdminDashboardDataRequest = {
        timeRange: req.body.timeRange ? {
          start: new Date(req.body.timeRange.start),
          end: new Date(req.body.timeRange.end)
        } : undefined,
        platforms: req.body.platforms,
        detailLevel: req.body.detailLevel || 'summary'
      };

      // Fetch dashboard data
      const dashboardData: AdminDashboardDataResponse = 
        detectionService.getAdminDashboardData(dashboardRequest);

      res.status(200).json(dashboardData);
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Trigger a manual scan from admin dashboard
   */
  static async triggerManualScan(req: Request, res: Response): Promise<void> {
    try {
      // Ensure user is an admin
      if (!req.user || !req.user.isAdmin) {
        res.status(403).json({ 
          error: 'Unauthorized access. Admin rights required.' 
        });
        return;
      }

      // Validate scan parameters
      const { platform, connectionId } = req.body;
      if (!platform || !connectionId) {
        res.status(400).json({ 
          error: 'Platform and connectionId are required' 
        });
        return;
      }

      // TODO: Implement actual scan trigger logic
      // This would integrate with existing detection services
      // For now, we'll just record a mock scan event
      detectionService.recordScanEvent({
        timestamp: new Date(),
        platform,
        connectionId,
        status: 'started',
        message: 'Manual scan initiated by admin',
        eventType: 'detection_scan'
      });

      res.status(200).json({ 
        message: 'Manual scan triggered successfully',
        platform,
        connectionId
      });
    } catch (error) {
      console.error('Error triggering manual scan:', error);
      res.status(500).json({ 
        error: 'Failed to trigger manual scan',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}