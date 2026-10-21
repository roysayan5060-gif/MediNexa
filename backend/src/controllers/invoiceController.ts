import { Response } from 'express';
import { Invoice, IInvoice } from '../models/Invoice';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Clinic } from '../models/Clinic';
import { Appointment } from '../models/Appointment';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { FinancialLedgerEntry } from '../models/FinancialLedger';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

export const getInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId, clinicId, status } = req.query;
    const query: any = {};

    if (req.user?.role === 'patient') {
      if (!req.user.patientId) {
        res.json({ success: true, data: [] });
        return;
      }
      query.patientId = req.user.patientId;
    } else if (patientId) {
      const patient = await Patient.findOne(
        patientId.toString().startsWith('PAT-') ? { patientId } : { _id: patientId }
      );
      if (patient) query.patientId = patient._id;
    }

    if (req.user?.role === 'doctor') {
      query.doctorId = req.user.doctorId;
    } else if (doctorId && doctorId !== 'all') {
      query.doctorId = doctorId;
    }

    if (req.user?.role === 'clinic_admin' && req.user.clinicId) {
      query.clinicId = req.user.clinicId;
    } else if (clinicId && clinicId !== 'all') {
      query.clinicId = clinicId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName patientId phone email')
      .populate('doctorId', 'name specialty consultationFee')
      .populate('clinicId', 'name city state phone')
      .populate('appointmentId', 'appointmentDate startTime status reason');

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: error.message });
  }
};

export const createInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      patientId,
      doctorId,
      clinicId,
      appointmentId,
      items,
      subtotal,
      tax = 0,
      discount = 0,
      totalAmount,
      paymentMethod = 'test_simulation',
      notes,
    } = req.body;

    const patient = await Patient.findOne(
      patientId.startsWith('PAT-') ? { patientId } : { _id: patientId }
    );
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    // Resolve clinic
    let targetClinicId = clinicId || req.user?.clinicId;
    if (!targetClinicId) {
      const defaultClinic = await Clinic.findOne({ isActive: true });
      targetClinicId = defaultClinic ? defaultClinic._id : undefined;
    }

    const finalTotal = totalAmount || subtotal;
    const invoiceNumber = generateId('INV');

    // Calculate split
    let doctorShareAmount = 0;
    let clinicShareAmount = finalTotal;

    const targetDoctorId = doctorId || req.user?.doctorId;
    if (targetDoctorId && targetClinicId) {
      const membership = await ClinicDoctorMembership.findOne({
        clinicId: targetClinicId,
        doctorId: targetDoctorId,
      });
      const splitPct = membership ? membership.doctorSharePercentage : 70;
      doctorShareAmount = Math.round((finalTotal * splitPct) / 100);
      clinicShareAmount = finalTotal - doctorShareAmount;
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId: patient._id,
      doctorId: targetDoctorId,
      clinicId: targetClinicId,
      appointmentId,
      items: items && items.length > 0 ? items : [{ description: 'Consultation Fee', unitPrice: finalTotal, quantity: 1, total: finalTotal }],
      subtotal: subtotal || finalTotal,
      tax,
      discount,
      totalAmount: finalTotal,
      amountPaise: Math.round(finalTotal * 100),
      doctorShareAmount,
      clinicShareAmount,
      status: 'pending',
      paymentMethod,
      notes: notes || 'Doctor X Consultation Fee Invoice',
    });

    await logAuditEvent(req, 'CREATE_INVOICE', 'Invoice', invoice._id.toString(), {
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: finalTotal,
      clinicId: targetClinicId,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create invoice', error: error.message });
  }
};

/**
 * Quick Counter POS Payment Collection at Clinic
 */
export const quickCollectInvoice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      patientId,
      doctorId,
      clinicId,
      amount,
      serviceDescription = 'Walk-in Consultation & Treatment',
      paymentMethod = 'cash',
      notes,
    } = req.body;

    const patient = await Patient.findOne(
      patientId.startsWith('PAT-') ? { patientId } : { _id: patientId }
    );
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    let targetClinicId = clinicId || req.user?.clinicId;
    if (!targetClinicId) {
      const defaultClinic = await Clinic.findOne({ isActive: true });
      targetClinicId = defaultClinic ? defaultClinic._id : undefined;
    }

    const totalAmount = Number(amount) || 500;
    const invoiceNumber = generateId('INV');

    // Calculate doctor split
    let doctorShareAmount = 0;
    let clinicShareAmount = totalAmount;

    if (doctorId && targetClinicId) {
      const membership = await ClinicDoctorMembership.findOne({
        clinicId: targetClinicId,
        doctorId,
      });
      const splitPct = membership ? membership.doctorSharePercentage : 70;
      doctorShareAmount = Math.round((totalAmount * splitPct) / 100);
      clinicShareAmount = totalAmount - doctorShareAmount;
    }

    const transactionRef = `COUNTER-POS-${Date.now().toString().slice(-6)}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId: patient._id,
      doctorId,
      clinicId: targetClinicId,
      items: [
        {
          description: serviceDescription,
          unitPrice: totalAmount,
          quantity: 1,
          total: totalAmount,
        },
      ],
      subtotal: totalAmount,
      tax: 0,
      discount: 0,
      totalAmount,
      amountPaise: Math.round(totalAmount * 100),
      doctorShareAmount,
      clinicShareAmount,
      status: 'paid',
      paymentMethod,
      paymentDate: new Date(),
      transactionRef,
      notes: notes || 'Counter walk-in payment collection',
    });

    // Record in immutable financial ledger (Credit to clinic)
    if (targetClinicId) {
      const ledgerEntryId = generateId('LEDG');
      await FinancialLedgerEntry.create({
        entryId: ledgerEntryId,
        clinicId: targetClinicId,
        type: 'patient_payment',
        direction: 'credit',
        amountPaise: Math.round(totalAmount * 100),
        amountInr: totalAmount,
        status: 'cleared',
        description: `Counter POS Collection from ${patient.firstName} ${patient.lastName} (Invoice ${invoiceNumber})`,
        referenceType: 'Invoice',
        referenceId: invoiceNumber,
        invoiceId: invoice._id,
        patientId: patient._id,
        doctorId,
        paymentMethod,
        transactionRef,
      });
    }

    await logAuditEvent(req, 'QUICK_COLLECT_POS', 'Invoice', invoice._id.toString(), {
      invoiceNumber,
      totalAmount,
      paymentMethod,
      transactionRef,
    });

    res.status(201).json({
      success: true,
      message: `Counter payment of ₹${totalAmount} collected and recorded.`,
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record counter payment', error: error.message });
  }
};

/**
 * Process Patient Consultation Payment (Card, UPI, Netbanking, Pay at Clinic)
 * The recipient of the payment is the CLINIC.
 * Creates an immutable credit entry in the Clinic Financial Ledger.
 */
export const processTestPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { paymentMethod = 'upi_test' } = req.body;

    const query = id.startsWith('INV-') ? { invoiceNumber: id } : { _id: id };
    const invoice = await Invoice.findOne(query)
      .populate('patientId')
      .populate('doctorId')
      .populate('clinicId');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    if (invoice.status === 'paid') {
      res.status(400).json({ success: false, message: 'Invoice is already marked as paid' });
      return;
    }

    // Resolve clinic
    let targetClinicId = invoice.clinicId?._id || req.user?.clinicId;
    if (!targetClinicId) {
      const defaultClinic = await Clinic.findOne({ isActive: true });
      targetClinicId = defaultClinic ? defaultClinic._id : undefined;
      invoice.clinicId = targetClinicId;
    }

    // Calculate doctor split if not yet calculated
    if ((!invoice.doctorShareAmount || invoice.doctorShareAmount === 0) && invoice.doctorId && targetClinicId) {
      const membership = await ClinicDoctorMembership.findOne({
        clinicId: targetClinicId,
        doctorId: invoice.doctorId._id,
      });
      const splitPct = membership ? membership.doctorSharePercentage : 70;
      invoice.doctorShareAmount = Math.round((invoice.totalAmount * splitPct) / 100);
      invoice.clinicShareAmount = invoice.totalAmount - invoice.doctorShareAmount;
    }

    invoice.status = 'paid';
    invoice.paymentMethod = paymentMethod as any;
    invoice.paymentDate = new Date();
    invoice.transactionRef = `TXN-DEMO-${Date.now().toString().slice(-6)}`;
    invoice.isDemo = true;
    invoice.paymentGateway = 'demo';
    invoice.notes = 'SIMULATED DEMO TRANSACTION — No real money received.';
    await invoice.save();

    // Confirm linked appointment
    if (invoice.appointmentId) {
      await Appointment.findByIdAndUpdate(invoice.appointmentId, {
        status: 'confirmed',
        paymentStatus: 'paid',
      });
    }

    // Record immutable financial ledger entry (Credit to Clinic)
    if (targetClinicId) {
      const ledgerEntryId = generateId('LEDG');
      await FinancialLedgerEntry.create({
        entryId: ledgerEntryId,
        clinicId: targetClinicId,
        type: 'patient_payment',
        direction: 'credit',
        amountPaise: Math.round(invoice.totalAmount * 100),
        amountInr: invoice.totalAmount,
        currency: 'INR',
        status: 'cleared',
        description: `[DEMO SIMULATION] Patient consultation payment: Invoice ${invoice.invoiceNumber} via ${paymentMethod}`,
        referenceType: 'Invoice',
        referenceId: invoice.invoiceNumber,
        invoiceId: invoice._id,
        patientId: invoice.patientId?._id,
        doctorId: invoice.doctorId?._id,
        transactionRef: invoice.transactionRef,
        paymentMethod,
        netAmountPaise: Math.round(invoice.totalAmount * 100),
        idempotencyKey: invoice.transactionRef,
        metadata: { isDemo: true },
      });
    }

    await logAuditEvent(req, 'PROCESS_PATIENT_PAYMENT', 'Invoice', invoice._id.toString(), {
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.totalAmount,
      recipientClinicId: targetClinicId,
      transactionRef: invoice.transactionRef,
    });

    res.json({
      success: true,
      message: 'Payment received by Clinic successfully (Demo Simulation Mode - No card data stored).',
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to process payment', error: error.message });
  }
};

/**
 * POST /api/invoices/:id/refund
 * Refund management & reversal entry in Financial Ledger
 */
export const refundInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { refundReason = 'Appointment cancelled / Patient requested refund', amount } = req.body;

    const query = id.startsWith('INV-') ? { invoiceNumber: id } : { _id: id };
    const invoice = await Invoice.findOne(query).populate('appointmentId');

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    if (invoice.status !== 'paid') {
      res.status(400).json({ success: false, message: 'Only paid invoices can be refunded' });
      return;
    }

    const refundAmount = amount ? Math.min(Number(amount), invoice.totalAmount) : invoice.totalAmount;
    const refundRef = `REF-${Date.now().toString().slice(-6)}`;

    invoice.status = 'refunded';
    invoice.refundStatus = 'refunded';
    invoice.refundAmount = refundAmount;
    invoice.refundReason = refundReason;
    invoice.refundRef = refundRef;
    invoice.refundDate = new Date();
    await invoice.save();

    // If an appointment was linked, cancel it according to cancellation policy
    if (invoice.appointmentId) {
      await Appointment.findByIdAndUpdate(invoice.appointmentId, {
        status: 'cancelled',
        cancellationReason: `Refunded: ${refundReason}`,
        cancelledBy: req.user?._id,
      });
    }

    // Write reversal entry into the Financial Ledger (Debit from Clinic)
    if (invoice.clinicId) {
      const ledgerEntryId = generateId('LEDG');
      await FinancialLedgerEntry.create({
        entryId: ledgerEntryId,
        clinicId: invoice.clinicId,
        type: 'refund',
        direction: 'debit',
        amountPaise: Math.round(refundAmount * 100),
        amountInr: refundAmount,
        status: 'cleared',
        description: `Refund issued for Invoice ${invoice.invoiceNumber}: ${refundReason}`,
        referenceType: 'Refund',
        referenceId: refundRef,
        invoiceId: invoice._id,
        patientId: invoice.patientId,
        doctorId: invoice.doctorId,
        transactionRef: refundRef,
      });
    }

    await logAuditEvent(req, 'REFUND_INVOICE', 'Invoice', invoice._id.toString(), {
      invoiceNumber: invoice.invoiceNumber,
      refundAmount,
      refundRef,
      reason: refundReason,
    });

    res.json({
      success: true,
      message: `Refund of ₹${refundAmount} processed successfully. Ledger reversal entry recorded.`,
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to process refund', error: error.message });
  }
};

import { razorpayService } from '../services/razorpayService';

/**
 * POST /api/invoices/verify-payment
 * Verification endpoint for Indian payment gateways (Razorpay)
 * Computes and checks cryptographic signature and confirms payment.
 */
export const verifyPaymentGateway = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceNumber } = req.body;

    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    if (invoice.status === 'paid') {
      res.json({ success: true, message: 'Invoice already marked as paid.', data: invoice });
      return;
    }

    // Cryptographic signature check
    const isValid = razorpayService.verifyPaymentSignature({
      orderId: razorpay_order_id || invoice.gatewayOrderId || '',
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      res.status(400).json({ success: false, message: 'Gateway signature verification failed. Invalid signature.' });
      return;
    }

    invoice.status = 'paid';
    invoice.gatewayPaymentId = razorpay_payment_id;
    invoice.gatewaySignature = razorpay_signature;
    invoice.gatewayStatus = 'captured';
    invoice.paymentMethod = invoice.isDemo ? 'upi_test' : 'razorpay';
    invoice.paymentDate = new Date();
    invoice.transactionRef = razorpay_payment_id;
    await invoice.save();

    // Confirm appointment
    if (invoice.appointmentId) {
      await Appointment.findByIdAndUpdate(invoice.appointmentId, {
        status: 'confirmed',
        paymentStatus: 'paid',
      });
    }

    // Record in ledger
    if (invoice.clinicId) {
      const existingLedger = await FinancialLedgerEntry.findOne({ transactionRef: razorpay_payment_id });
      if (!existingLedger) {
        await FinancialLedgerEntry.create({
          entryId: generateId('LEDG'),
          clinicId: invoice.clinicId,
          type: 'patient_payment',
          direction: 'credit',
          amountPaise: invoice.amountPaise,
          amountInr: invoice.totalAmount,
          currency: 'INR',
          status: 'cleared',
          description: `${invoice.isDemo ? '[DEMO SIMULATION] ' : ''}Patient consultation payment: Invoice ${invoice.invoiceNumber}`,
          referenceType: 'Invoice',
          referenceId: invoice.invoiceNumber,
          invoiceId: invoice._id,
          patientId: invoice.patientId,
          doctorId: invoice.doctorId,
          paymentMethod: invoice.paymentMethod,
          transactionRef: razorpay_payment_id,
          idempotencyKey: razorpay_payment_id,
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment verified successfully with gateway signature verification.',
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gateway signature verification failed', error: error.message });
  }
};
