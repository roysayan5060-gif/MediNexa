import { Router } from 'express';
import {
  createEncounter,
  getEncounters,
  getEncounterById,
} from '../controllers/encounterController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createEncounterSchema } from '../validations';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  validateRequest(createEncounterSchema),
  createEncounter
);

router.get('/', getEncounters);
router.get('/:id', getEncounterById);

export default router;
