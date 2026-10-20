import { Router } from 'express';
import {
  getPlatformStats,
  getAuditLogs,
  getUsers,
  toggleUserStatus,
  getClinics,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// Platform Admin and Clinic Admin endpoints
router.get(
  '/stats',
  authorizeRoles('platform_admin', 'clinic_admin'),
  getPlatformStats
);

router.get(
  '/audit-logs',
  authorizeRoles('platform_admin'),
  getAuditLogs
);

router.get(
  '/users',
  authorizeRoles('platform_admin', 'clinic_admin'),
  getUsers
);

router.patch(
  '/users/:id/toggle-status',
  authorizeRoles('platform_admin'),
  toggleUserStatus
);

router.get(
  '/clinics',
  authorizeRoles('platform_admin', 'clinic_admin'),
  getClinics
);

export default router;
