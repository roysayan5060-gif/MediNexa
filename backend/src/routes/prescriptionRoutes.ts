import { Router } from 'express';
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  amendPrescription,
  sendPrescriptionWhatsApp,
} from '../controllers/prescriptionController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles, verifyPatientRecordAccess } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createPrescriptionSchema, amendPrescriptionSchema } from '../validations';

const router = Router();

router.use(authenticate);

// Doctors can create prescriptions
router.post(
  '/',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  validateRequest(createPrescriptionSchema),
  createPrescription
);

// Get prescriptions list (role-filtered)
router.get('/', getPrescriptions);

// Get single prescription (viewable by patient, doctor, admin)
router.get('/:id', getPrescriptionById);

// Amend prescription (only doctor who issued it or authorized doctor)
router.put(
  '/:id/amend',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  validateRequest(amendPrescriptionSchema),
  amendPrescription
);

// Direct WhatsApp prescription dispatch
router.post(
  '/:id/send-whatsapp',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  sendPrescriptionWhatsApp
);

export default router;
