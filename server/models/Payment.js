const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true, trim: true },
  payment_id: { type: String, trim: true },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient_name: { type: String },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctor_name: { type: String },
  clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  clinic_name: { type: String },
  
  amount: { type: Number, required: true, min: 0 }, // In standard currency units (e.g. INR / USD)
  currency: { type: String, default: 'INR' },
  gateway: { type: String, default: 'razorpay' },
  gateway_fee: { type: Number, default: 0 }, // e.g. 2% + GST
  net_amount: { type: Number, default: 0 },

  status: { 
    type: String, 
    enum: ['pending', 'verified', 'failed', 'refunded'], 
    default: 'pending' 
  },
  signature_verified: { type: Boolean, default: false },
  refund_status: { 
    type: String, 
    enum: ['none', 'requested', 'processed', 'failed'], 
    default: 'none' 
  },
  refund_id: { type: String },
  refund_amount: { type: Number, default: 0 },

  // Bank settlement tracking (clearly distinguished from internal accounting)
  settlement_status: { 
    type: String, 
    enum: ['unsettled', 'processing', 'settled_to_bank'], 
    default: 'unsettled' 
  },
  settled_to_bank_at: { type: Date },
  settlement_utr: { type: String },

  created_at: { type: Date, default: Date.now },
  verified_at: { type: Date }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
