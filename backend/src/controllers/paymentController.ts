import { Request, Response } from 'express';
import { Appointment } from '../models/Appointment';
import { Invoice } from '../models/Invoice';
import { Doctor } from '../models/Doctor';
import { Clinic } from '../models/Clinic';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { FinancialLedgerEntry } from '../models/FinancialLedger';
import { WebhookEvent } from '../models/WebhookEvent';
import { razorpayService } from '../services/razorpayService';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

/**
 * GET /api/payments/config
 * Returns public configuration for payment gateway (keyId, mode, live/test/demo flag).
 * Secret keys are strictly retained on the server.
 */
export const getPaymentConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isConfigured = razorpayService.isConfigured();
    const isLive = razorpayService.isLiveMode();
    const keyId = razorpayService.getKeyId();

    res.json({
      success: true,
      data: {
        isConfigured,
        isLive,
        isDemo: !isConfigured,
        gateway: isConfigured ? 'razorpay' : 'demo_simulation',
        keyId: isConfigured ? keyId : null,
        currency: 'INR',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve payment configuration', error: error.message });
  }
};

/**
 * POST /api/payments/create-order
 * Authoritatively creates a payment order on the gateway.
 * 
 * SECURITY:
 * Never trusts client-supplied amounts, clinicId, doctorId, or status.
 * All figures are loaded and validated from MongoDB directly.
 */
export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { appointmentId, invoiceNumber } = req.body;

    if (!appointmentId && !invoiceNumber) {
      res.status(400).json({ success: false, message: 'appointmentId or invoiceNumber is required' });
      return;
    }

    // Resolve Appointment
    let appointment: any = null;
    if (appointmentId) {
      appointment = await Appointment.findOne(
        String(appointmentId).startsWith('APT-') ? { appointmentId } : { _id: appointmentId }
      );
    }

    // Resolve or find Invoice
    let invoice: any = null;
    if (invoiceNumber) {
      invoice = await Invoice.findOne({ invoiceNumber });
    } else if (appointment) {
      invoice = await Invoice.findOne({ appointmentId: appointment._id });
    }

    // If invoice does not exist yet, build it using database values
    if (!invoice && appointment) {
      const doctor = await Doctor.findById(appointment.doctorId);
      if (!doctor) {
        res.status(404).json({ success: false, message: 'Associated doctor record not found' });
        return;
      }

      // Validated fee strictly from database
      const fee = Number(doctor.consultationFee) || 500;
      const invNumber = generateId('INV');

      // Calculate fee split
      let doctorShareAmount = Math.round(fee * 0.7);
      let clinicShareAmount = fee - doctorShareAmount;

      if (appointment.clinicId) {
        const membership = await ClinicDoctorMembership.findOne({
          clinicId: appointment.clinicId,
          doctorId: doctor._id,
        });
        if (membership) {
          doctorShareAmount = Math.round((fee * membership.doctorSharePercentage) / 100);
          clinicShareAmount = fee - doctorShareAmount;
        }
      }

      invoice = await Invoice.create({
        invoiceNumber: invNumber,
        patientId: appointment.patientId,
        doctorId: doctor._id,
        clinicId: appointment.clinicId,
        appointmentId: appointment._id,
        items: [
          {
            description: `Consultation Fee with Dr. ${doctor.name} (${doctor.specialty})`,
            unitPrice: fee,
            quantity: 1,
            total: fee,
          },
        ],
        subtotal: fee,
        totalAmount: fee,
        amountPaise: Math.round(fee * 100),
        doctorShareAmount,
        clinicShareAmount,
        status: 'pending',
        currency: 'INR',
        notes: `Consultation invoice for appointment ${appointment.appointmentId}`,
      });
    }

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found for this consultation' });
      return;
    }

    if (invoice.status === 'paid') {
      res.status(400).json({ success: false, message: 'This consultation has already been paid for' });
      return;
    }

    // Server-enforced amount in paise
    const amountPaise = invoice.amountPaise || Math.round(invoice.totalAmount * 100);

    // Create order with Razorpay service
    const order = await razorpayService.createOrder({
      amountPaise,
      currency: 'INR',
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceNumber: invoice.invoiceNumber,
        appointmentId: appointment ? appointment.appointmentId : '',
        patientId: invoice.patientId.toString(),
        doctorId: invoice.doctorId ? invoice.doctorId.toString() : '',
        clinicId: invoice.clinicId ? invoice.clinicId.toString() : '',
      },
    });

    // Update invoice with gateway order details
    invoice.gatewayOrderId = order.orderId;
    invoice.gatewayStatus = 'created';
    invoice.paymentGateway = order.isDemo ? 'demo' : 'razorpay';
    invoice.isDemo = order.isDemo;
    invoice.currency = order.currency;
    if (order.isDemo) {
      invoice.notes = 'SIMULATED DEMO TRANSACTION — No real money received.';
    }
    await invoice.save();

    if (appointment) {
      appointment.paymentStatus = 'pending';
      await appointment.save();
    }

    await logAuditEvent(req, 'CREATE_PAYMENT_ORDER', 'Invoice', invoice._id.toString(), {
      invoiceNumber: invoice.invoiceNumber,
      gatewayOrderId: order.orderId,
      amountPaise,
      isDemo: order.isDemo,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.orderId,
        amountPaise,
        amountInr: invoice.totalAmount,
        currency: order.currency,
        keyId: razorpayService.getKeyId(),
        invoiceNumber: invoice.invoiceNumber,
        appointmentId: appointment ? appointment.appointmentId : undefined,
        isDemo: order.isDemo,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create payment order', error: error.message });
  }
};

/**
 * POST /api/payments/verify-signature
 * Server-side payment signature verification and payment-status verification.
 * 
 * Computes HMAC-SHA256 signature using RAZORPAY_KEY_SECRET and verifies
 * that the payment status is captured and amount matches server records.
 */
export const verifyPaymentSignature = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointmentId,
      invoiceNumber,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
      });
      return;
    }

    // Resolve Invoice by gatewayOrderId or invoiceNumber
    let invoice: any = null;
    if (razorpay_order_id) {
      invoice = await Invoice.findOne({ gatewayOrderId: razorpay_order_id });
    }
    if (!invoice && invoiceNumber) {
      invoice = await Invoice.findOne({ invoiceNumber });
    }
    if (!invoice && appointmentId) {
      const appt = await Appointment.findOne(
        String(appointmentId).startsWith('APT-') ? { appointmentId } : { _id: appointmentId }
      );
      if (appt) {
        invoice = await Invoice.findOne({ appointmentId: appt._id });
      }
    }

    if (!invoice) {
      res.status(404).json({ success: false, message: 'No invoice found matching this order' });
      return;
    }

    // Idempotency: If already verified and marked paid, return success
    if (invoice.status === 'paid' && invoice.gatewayPaymentId === razorpay_payment_id) {
      res.json({
        success: true,
        message: 'Payment already verified and processed.',
        data: { invoice, isDemo: invoice.isDemo },
      });
      return;
    }

    // 1. Verify HMAC-SHA256 signature
    const isSignatureValid = razorpayService.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isSignatureValid) {
      await logAuditEvent(req, 'PAYMENT_SIGNATURE_TAMPER_ATTEMPT', 'Invoice', invoice._id.toString(), {
        razorpay_order_id,
        razorpay_payment_id,
      });

      res.status(400).json({
        success: false,
        message: 'Payment signature verification failed. Potential tampering detected.',
      });
      return;
    }

    // 2. Authoritative payment verification against gateway (for live/test mode)
    let paymentDetails: any = null;
    if (!invoice.isDemo && razorpayService.isConfigured()) {
      try {
        paymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);

        // Verify order ID matches
        if (paymentDetails.order_id !== razorpay_order_id) {
          res.status(400).json({
            success: false,
            message: 'Gateway order ID mismatch. Transaction rejected.',
          });
          return;
        }

        // Verify amount matches server record
        if (Number(paymentDetails.amount) !== invoice.amountPaise) {
          res.status(400).json({
            success: false,
            message: 'Payment amount mismatch. Transaction rejected.',
          });
          return;
        }

        // Verify status is captured or authorized
        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
          res.status(400).json({
            success: false,
            message: `Payment is in ${paymentDetails.status} state. Awaiting capture.`,
          });
          return;
        }
      } catch (err: any) {
        res.status(500).json({
          success: false,
          message: 'Failed to verify payment status with gateway: ' + err.message,
        });
        return;
      }
    }

    // 3. Mark Invoice as PAID
    invoice.status = 'paid';
    invoice.gatewayPaymentId = razorpay_payment_id;
    invoice.gatewaySignature = razorpay_signature;
    invoice.gatewayStatus = 'captured';
    invoice.paymentMethod = paymentDetails?.method || (invoice.isDemo ? 'upi_test' : 'razorpay');
    invoice.paymentDate = new Date();
    invoice.transactionRef = razorpay_payment_id;
    if (invoice.isDemo) {
      invoice.notes = 'SIMULATED DEMO TRANSACTION — No real money received.';
    }
    await invoice.save();

    // 4. Update Appointment to CONFIRMED and paymentStatus to PAID
    let appointment: any = null;
    if (invoice.appointmentId) {
      appointment = await Appointment.findById(invoice.appointmentId);
      if (appointment) {
        appointment.status = 'confirmed';
        appointment.paymentStatus = 'paid';
        await appointment.save();
      }
    }

    // 5. Record immutable credit entry into Clinic Financial Ledger
    // Only if a ledger entry for this payment ID has not already been created
    if (invoice.clinicId) {
      const existingLedger = await FinancialLedgerEntry.findOne({
        $or: [{ transactionRef: razorpay_payment_id }, { idempotencyKey: razorpay_payment_id }],
      });

      if (!existingLedger) {
        const ledgerEntryId = generateId('LEDG');
        await FinancialLedgerEntry.create({
          entryId: ledgerEntryId,
          clinicId: invoice.clinicId,
          type: 'patient_payment',
          direction: 'credit',
          amountPaise: invoice.amountPaise,
          amountInr: invoice.totalAmount,
          currency: 'INR',
          status: 'cleared',
          description: `${invoice.isDemo ? '[DEMO SIMULATION] ' : ''}Patient consultation payment: Invoice ${invoice.invoiceNumber} via ${invoice.paymentMethod}`,
          referenceType: 'Invoice',
          referenceId: invoice.invoiceNumber,
          invoiceId: invoice._id,
          patientId: invoice.patientId,
          doctorId: invoice.doctorId,
          paymentMethod: invoice.paymentMethod,
          transactionRef: razorpay_payment_id,
          idempotencyKey: razorpay_payment_id,
          metadata: {
            gatewayOrderId: razorpay_order_id,
            isDemo: invoice.isDemo,
          },
        });
      }
    }

    await logAuditEvent(req, 'VERIFY_PAYMENT_SUCCESS', 'Invoice', invoice._id.toString(), {
      invoiceNumber: invoice.invoiceNumber,
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      isDemo: invoice.isDemo,
      appointmentId: appointment?.appointmentId,
    });

    res.json({
      success: true,
      message: invoice.isDemo
        ? 'Simulated demo payment completed successfully (No real money processed).'
        : 'Payment verified and appointment confirmed successfully.',
      data: {
        invoice,
        appointment,
        isDemo: invoice.isDemo,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to verify payment', error: error.message });
  }
};

/**
 * POST /api/payments/webhook
 * Authoritative Webhook endpoint for Razorpay asynchronous events.
 * 
 * Verifies webhook signature with RAZORPAY_WEBHOOK_SECRET.
 * Enforces strict event idempotency so repeated webhooks do not duplicate ledger records.
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature) {
      res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
      return;
    }

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Webhook] Invalid webhook signature detected.');
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }

    const eventPayload = req.body;
    const eventName = eventPayload.event;
    const eventId =
      (req.headers['x-razorpay-event-id'] as string) ||
      eventPayload.event_id ||
      eventPayload.id ||
      `${eventName}_${Date.now()}`;

    // IDEMPOTENCY CHECK: Check if this event was already processed
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      res.status(200).json({
        success: true,
        message: 'Webhook event already processed (idempotent)',
        eventId,
      });
      return;
    }

    // Record webhook event as processing
    const webhookDoc = await WebhookEvent.create({
      eventId,
      event: eventName,
      payload: eventPayload,
      processedAt: new Date(),
      status: 'processed',
    });

    // Handle supported events
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        webhookDoc.orderId = orderId;
        webhookDoc.paymentId = paymentId;
        await webhookDoc.save();

        const invoice = await Invoice.findOne({ gatewayOrderId: orderId });
        if (invoice && invoice.status !== 'paid') {
          invoice.status = 'paid';
          invoice.gatewayPaymentId = paymentId;
          invoice.gatewayStatus = 'captured';
          invoice.paymentMethod = paymentEntity?.method || 'razorpay';
          invoice.paymentDate = new Date();
          invoice.transactionRef = paymentId;
          await invoice.save();

          // Update appointment
          if (invoice.appointmentId) {
            await Appointment.findByIdAndUpdate(invoice.appointmentId, {
              status: 'confirmed',
              paymentStatus: 'paid',
            });
          }

          // Record in ledger if not already recorded
          if (invoice.clinicId) {
            const existingLedger = await FinancialLedgerEntry.findOne({
              $or: [{ transactionRef: paymentId }, { idempotencyKey: paymentId }],
            });

            if (!existingLedger) {
              const ledgerEntryId = generateId('LEDG');
              await FinancialLedgerEntry.create({
                entryId: ledgerEntryId,
                clinicId: invoice.clinicId,
                type: 'patient_payment',
                direction: 'credit',
                amountPaise: invoice.amountPaise,
                amountInr: invoice.totalAmount,
                currency: 'INR',
                status: 'cleared',
                description: `Patient consultation collection via Webhook (${eventName}): Invoice ${invoice.invoiceNumber}`,
                referenceType: 'Invoice',
                referenceId: invoice.invoiceNumber,
                invoiceId: invoice._id,
                patientId: invoice.patientId,
                doctorId: invoice.doctorId,
                paymentMethod: invoice.paymentMethod,
                transactionRef: paymentId,
                idempotencyKey: paymentId,
              });
            }
          }
        }
      }
    } else if (eventName === 'payment.failed') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        const invoice = await Invoice.findOne({ gatewayOrderId: orderId });
        if (invoice && invoice.status !== 'paid') {
          invoice.gatewayStatus = 'failed';
          invoice.notes = `Payment failed via gateway: ${paymentEntity?.error_description || 'Gateway error'}`;
          await invoice.save();
        }
      }
    } else if (eventName === 'refund.processed') {
      const refundEntity = eventPayload.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        const invoice = await Invoice.findOne({ gatewayPaymentId: paymentId });
        if (invoice && invoice.status === 'paid') {
          invoice.status = 'refunded';
          invoice.refundStatus = 'refunded';
          invoice.refundAmount = Number(refundEntity.amount) / 100;
          invoice.refundRef = refundEntity.id;
          invoice.refundDate = new Date();
          await invoice.save();

          // Ledger reversal
          if (invoice.clinicId) {
            const ledgerEntryId = generateId('LEDG');
            await FinancialLedgerEntry.create({
              entryId: ledgerEntryId,
              clinicId: invoice.clinicId,
              type: 'refund',
              direction: 'debit',
              amountPaise: Number(refundEntity.amount),
              amountInr: Number(refundEntity.amount) / 100,
              currency: 'INR',
              status: 'cleared',
              description: `Gateway refund processed via Webhook: Refund ${refundEntity.id} for Invoice ${invoice.invoiceNumber}`,
              referenceType: 'Refund',
              referenceId: refundEntity.id,
              invoiceId: invoice._id,
              patientId: invoice.patientId,
              doctorId: invoice.doctorId,
              transactionRef: refundEntity.id,
              idempotencyKey: refundEntity.id,
            });
          }
        }
      }
    }

    res.status(200).json({ success: true, status: 'processed', eventId });
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing error', error: error.message });
  }
};

/**
 * POST /api/payments/cancel-order
 * Explicitly marks a checkout order as cancelled when modal is dismissed
 */
export const cancelPaymentOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, invoiceNumber } = req.body;

    const query = orderId ? { gatewayOrderId: orderId } : { invoiceNumber };
    const invoice = await Invoice.findOne(query);

    if (invoice && invoice.status !== 'paid') {
      invoice.gatewayStatus = 'failed';
      await invoice.save();
    }

    res.json({ success: true, message: 'Payment order marked as cancelled' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
  }
};
