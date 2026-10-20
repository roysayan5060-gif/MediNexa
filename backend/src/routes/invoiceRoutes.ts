import { Router } from 'express';
import {
  getInvoices,
  createInvoice,
  quickCollectInvoice,
  processTestPayment,
  refundInvoice,
  verifyPaymentGateway,
} from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createInvoiceSchema } from '../validations';

const router = Router();

router.use(authenticate);

router.get('/', getInvoices);

router.post(
  '/',
  authorizeRoles('doctor', 'clinic_admin', 'platform_admin'),
  validateRequest(createInvoiceSchema),
  createInvoice
);

router.post(
  '/quick-collect',
  authorizeRoles('clinic_admin', 'platform_admin'),
  quickCollectInvoice
);

router.post('/:id/pay', processTestPayment);

router.post(
  '/:id/refund',
  authorizeRoles('clinic_admin', 'platform_admin'),
  refundInvoice
);

router.post('/verify-payment', verifyPaymentGateway);

export default router;
