import { Router } from 'express';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} from '../controllers/patientController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles, verifyPatientRecordAccess } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createPatientSchema, updatePatientSchema } from '../validations';

const router = Router();

// Only authenticated users can access patient routes
router.use(authenticate);

// Get patients list (role-filtered in controller)
router.get('/', getPatients);

// Register a new patient (Doctors, Clinic Admins, Platform Admins)
router.post(
  '/',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  validateRequest(createPatientSchema),
  createPatient
);

// Get single patient profile with clinical history (checked by verifyPatientRecordAccess)
router.get('/:id', verifyPatientRecordAccess, getPatientById);

// Update patient details (patient can update permitted profile fields; doctors/admins can update clinical details)
router.put('/:id', verifyPatientRecordAccess, validateRequest(updatePatientSchema), updatePatient);

export default router;
