import { Router } from 'express';
import {
  getClinics,
  getClinicById,
  updateClinic,
  getClinicDashboardOverview,
  getClinicDoctors,
  addDoctorToClinic,
  updateClinicDoctorSchedule,
  getClinicFinancialLedger,
  getDoctorSettlements,
  previewDoctorSettlements,
  createDoctorSettlement,
  markSettlementPaid,
} from '../controllers/clinicController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// Public / Patient directory lookup
router.get('/', getClinics);
router.get('/:id', getClinicById);

// Protected Clinic Administration Routes
router.use(authenticate);

// Clinic Dashboard & Profile
router.get(
  '/:id/dashboard-overview',
  authorizeRoles('clinic_admin', 'platform_admin'),
  getClinicDashboardOverview
);
router.put(
  '/:id',
  authorizeRoles('clinic_admin', 'platform_admin'),
  updateClinic
);

// Doctor & Schedule Management at Clinic
router.get(
  '/:id/doctors',
  authorizeRoles('clinic_admin', 'platform_admin', 'doctor'),
  getClinicDoctors
);
router.post(
  '/:id/doctors',
  authorizeRoles('clinic_admin', 'platform_admin'),
  addDoctorToClinic
);
router.put(
  '/:id/doctors/:membershipId',
  authorizeRoles('clinic_admin', 'platform_admin'),
  updateClinicDoctorSchedule
);

// Financial Ledger & Wallet
router.get(
  '/:id/financial-ledger',
  authorizeRoles('clinic_admin', 'platform_admin'),
  getClinicFinancialLedger
);

// Doctor Settlements
router.get(
  '/:id/settlements',
  authorizeRoles('clinic_admin', 'platform_admin', 'doctor'),
  getDoctorSettlements
);
router.post(
  '/:id/settlements/preview',
  authorizeRoles('clinic_admin', 'platform_admin'),
  previewDoctorSettlements
);
router.post(
  '/:id/settlements/create-batch',
  authorizeRoles('clinic_admin', 'platform_admin'),
  createDoctorSettlement
);
router.post(
  '/:id/settlements/:settlementId/pay',
  authorizeRoles('clinic_admin', 'platform_admin'),
  markSettlementPaid
);

export default router;
