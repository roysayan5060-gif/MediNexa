import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  getDoctorSlots,
  getDoctorDashboardStats,
  getDoctorEarnings,
  updateDoctor,
} from '../controllers/doctorController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// Doctor Dashboard metrics (must be doctor or admin)
router.get(
  '/dashboard',
  authenticate,
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  getDoctorDashboardStats
);

router.get(
  '/:id/dashboard',
  authenticate,
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  getDoctorDashboardStats
);

// Doctor Earnings and Settlements
router.get(
  '/earnings',
  authenticate,
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  getDoctorEarnings
);

router.get(
  '/:id/earnings',
  authenticate,
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  getDoctorEarnings
);

// Public doctor directory lookup
router.get('/', getDoctors);
router.get('/:id/slots', getDoctorSlots);
router.get('/:id', getDoctorById);

// Update doctor profile/working hours
router.put(
  '/:id',
  authenticate,
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  updateDoctor
);

export default router;
