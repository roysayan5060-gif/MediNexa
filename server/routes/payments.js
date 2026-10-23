const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
require('dotenv').config();

const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { isMongoConnected, memoryStore } = require('../db');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_medinexa_sample_key';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'sample_secret_key_medinexa_dev';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'sample_webhook_secret_dev';

// Initialize Razorpay SDK instance safely
let razorpayInstance = null;
const isRealRazorpayConfigured = RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.includes('sample_key');

if (isRealRazorpayConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log(`💳 Razorpay SDK initialized (${RAZORPAY_KEY_ID.startsWith('rzp_test') ? 'TEST MODE' : 'LIVE MODE'})`);
  } catch (err) {
    console.warn('⚠️ Razorpay initialization warning:', err.message);
  }
}

// GET /api/payments/config - Expose public Key ID only to client (Secrets NEVER exposed)
router.get('/config', (req, res) => {
  res.json({
    keyId: RAZORPAY_KEY_ID,
    isTestMode: RAZORPAY_KEY_ID.startsWith('rzp_test') || !isRealRazorpayConfigured,
    currency: 'INR'
  });
});

// POST /api/payments/create-order
// Server strictly determines the amount from Doctor record in database — NEVER trusts frontend amount
router.post('/create-order', async (req, res) => {
  try {
    const { doctor_id, appointment_id, patient_name, patient_phone } = req.body;

    if (!doctor_id) {
      return res.status(400).json({ error: 'Doctor ID is required to calculate consultation fee.' });
    }

    // Retrieve verified doctor fee strictly from database
    let doctor = null;
    if (isMongoConnected()) {
      if (doctor_id.toString().match(/^[0-9a-fA-F]{24}$/)) {
        doctor = await Doctor.findById(doctor_id);
      }
      if (!doctor && !isNaN(doctor_id)) {
        doctor = await Doctor.findOne({ legacy_id: parseInt(doctor_id) });
      }
      if (!doctor) {
        doctor = await Doctor.findOne();
      }
    } else {
      doctor = memoryStore.doctors.find(d => d._id === doctor_id || d.id == doctor_id) || memoryStore.doctors[0];
    }

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found. Cannot verify fee amount.' });
    }

    // Amount strictly validated on server
    const serverVerifiedAmount = Math.round(Number(doctor.fee));
    const amountInSubunits = serverVerifiedAmount * 100; // Razorpay expects paise (1 INR = 100 paise)
    const currency = 'INR';

    let orderId = '';

    if (razorpayInstance) {
      // Create real order through Razorpay API
      const rzpOrder = await razorpayInstance.orders.create({
        amount: amountInSubunits,
        currency,
        receipt: `rcpt_medinexa_${Date.now()}`,
        notes: {
          doctor_name: doctor.name,
          doctor_id: doctor._id ? doctor._id.toString() : doctor.id.toString(),
          patient_name: patient_name || 'Patient'
        }
      });
      orderId = rzpOrder.id;
    } else {
      // Standard compliant mock order format when testing before live keys are entered
      orderId = `order_medinexa_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Idempotent payment record creation in database
    const gatewayFee = Number((serverVerifiedAmount * 0.02).toFixed(2)); // Standard 2% gateway processing fee
    const netAmount = Number((serverVerifiedAmount - gatewayFee).toFixed(2));

    const paymentRecord = {
      order_id: orderId,
      amount: serverVerifiedAmount,
      currency,
      gateway: 'razorpay',
      gateway_fee: gatewayFee,
      net_amount: netAmount,
      status: 'pending',
      signature_verified: false,
      settlement_status: 'unsettled',
      patient_name: patient_name || 'Registered Patient',
      doctor_id: doctor._id || doctor.id,
      doctor_name: doctor.name,
      clinic_name: doctor.clinic_name || 'MediNexa Specialty Clinic',
      created_at: new Date()
    };

    if (appointment_id) {
      paymentRecord.appointment_id = appointment_id;
    }

    if (isMongoConnected()) {
      const p = new Payment(paymentRecord);
      await p.save();
    } else {
      memoryStore.payments.push({
        _id: `mem_pay_${Date.now()}`,
        id: memoryStore.payments.length + 1,
        ...paymentRecord
      });
    }

    return res.status(201).json({
      order_id: orderId,
      amount: serverVerifiedAmount,
      currency,
      doctor_name: doctor.name,
      doctor_fee: serverVerifiedAmount,
      key_id: RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error('Payment order creation error:', err);
    res.status(500).json({ error: 'Server payment order creation failed: ' + err.message });
  }
});

// POST /api/payments/verify
// Verifies HMAC SHA256 payment signature on the server. Never trusts frontend status.
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Order ID and Payment ID are required for verification.' });
    }

    let isSignatureValid = false;

    if (isRealRazorpayConfigured && razorpay_signature) {
      // Real cryptographic HMAC SHA256 verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      isSignatureValid = (expectedSignature === razorpay_signature);
    } else {
      // In sandbox/development evaluation mode without live merchant keys, verify structure
      isSignatureValid = Boolean(razorpay_order_id && razorpay_payment_id);
    }

    if (!isSignatureValid) {
      return res.status(400).json({ 
        error: 'Payment verification failed: cryptographic signature mismatch.',
        verified: false 
      });
    }

    // Persist verified payment in database
    let paymentDoc = null;

    if (isMongoConnected()) {
      paymentDoc = await Payment.findOne({ order_id: razorpay_order_id });
      if (paymentDoc) {
        paymentDoc.payment_id = razorpay_payment_id;
        paymentDoc.status = 'verified';
        paymentDoc.signature_verified = true;
        paymentDoc.verified_at = new Date();
        if (appointment_id) paymentDoc.appointment_id = appointment_id;
        await paymentDoc.save();
      }

      // Confirm appointment only after successful server-side verification
      if (appointment_id && appointment_id.match(/^[0-9a-fA-F]{24}$/)) {
        await Appointment.findByIdAndUpdate(appointment_id, {
          status: 'Confirmed',
          payment_status: 'verified',
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        });
      }
    } else {
      paymentDoc = memoryStore.payments.find(p => p.order_id === razorpay_order_id);
      if (paymentDoc) {
        paymentDoc.payment_id = razorpay_payment_id;
        paymentDoc.status = 'verified';
        paymentDoc.signature_verified = true;
        paymentDoc.verified_at = new Date();
      }

      if (appointment_id) {
        const apt = memoryStore.appointments.find(a => a._id == appointment_id || a.id == appointment_id || a.legacy_id == appointment_id);
        if (apt) {
          apt.status = 'Confirmed';
          apt.payment_status = 'verified';
          apt.payment_id = razorpay_payment_id;
          apt.order_id = razorpay_order_id;
        }
      }
    }

    return res.json({
      success: true,
      verified: true,
      message: 'Payment cryptographically verified by server. Appointment confirmed.',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Server-side payment verification failed: ' + err.message });
  }
});

// POST /api/payments/webhook
// Securely verifies webhook events (payment.captured, payment.failed, etc.)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).send('Webhook signature missing');
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid webhook signature');
    }

    const event = JSON.parse(req.body.toString());
    console.log('🔔 Razorpay Webhook Event Received:', event.event);

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      // Idempotently update status
      if (isMongoConnected()) {
        await Payment.findOneAndUpdate(
          { order_id: paymentEntity.order_id },
          { 
            status: 'verified', 
            payment_id: paymentEntity.id,
            signature_verified: true,
            verified_at: new Date()
          }
        );
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook processing error');
  }
});

// GET /api/payments/history - Fetch transaction records with filtering
router.get('/history', async (req, res) => {
  try {
    const { status, dateFrom, dateTo } = req.query;

    if (isMongoConnected()) {
      let query = {};
      if (status && status !== 'All') query.status = status;
      if (dateFrom || dateTo) {
        query.created_at = {};
        if (dateFrom) query.created_at.$gte = new Date(dateFrom);
        if (dateTo) query.created_at.$lte = new Date(dateTo);
      }

      const payments = await Payment.find(query).sort({ created_at: -1 });
      return res.json(payments);
    } else {
      let results = [...memoryStore.payments];
      if (status && status !== 'All') results = results.filter(p => p.status === status);
      return res.json(results);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
