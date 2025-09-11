import express from 'express';
import { AdminDashboardController } from '../controllers/admin-dashboard-controller';
import { requireAdminAccess } from '../middleware/auth-middleware'; // Assumed middleware

const adminRoutes = express.Router();

/**
 * Admin Dashboard Routes
 * Require admin access middleware to protect routes
 */
adminRoutes.post('/dashboard-data', 
  requireAdminAccess, 
  AdminDashboardController.getDashboardData
);

adminRoutes.post('/manual-scan', 
  requireAdminAccess, 
  AdminDashboardController.triggerManualScan
);

export default adminRoutes;