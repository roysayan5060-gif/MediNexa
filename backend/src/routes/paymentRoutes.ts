import { Router } from 'express';
import {
  getPaymentConfig,
  createPaymentOrder,
  verifyPaymentSignature,
  handleWebhook,
  cancelPaymentOrder,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public Webhook route: Razorpay calls this without user token
// Must be mounted before authenticate middleware
router.post('/webhook', handleWebhook);

// Protected routes (require user login)
router.get('/config', authenticate, getPaymentConfig);
router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify-signature', authenticate, verifyPaymentSignature);
router.post('/cancel-order', authenticate, cancelPaymentOrder);

export default router;
