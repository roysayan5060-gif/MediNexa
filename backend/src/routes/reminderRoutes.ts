import { Router } from 'express';
import {
  getReminders,
  createReminder,
  acknowledgeReminder,
  triggerWorkerRun,
} from '../controllers/reminderController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createReminderSchema } from '../validations';

const router = Router();

router.use(authenticate);

router.get('/', getReminders);
router.post(
  '/',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  validateRequest(createReminderSchema),
  createReminder
);
router.patch('/:id/acknowledge', acknowledgeReminder);
router.post(
  '/process-now',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  triggerWorkerRun
);

export default router;
