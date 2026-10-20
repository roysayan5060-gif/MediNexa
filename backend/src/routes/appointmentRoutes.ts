import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
} from '../controllers/appointmentController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createAppointmentSchema, updateAppointmentStatusSchema } from '../validations';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createAppointmentSchema), createAppointment);
router.get('/', getAppointments);
router.get('/:id', getAppointmentById);
router.patch('/:id/status', validateRequest(updateAppointmentStatusSchema), updateAppointmentStatus);

export default router;
