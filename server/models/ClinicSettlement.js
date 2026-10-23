const mongoose = require('mongoose');

const clinicSettlementSchema = new mongoose.Schema({
  clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctor_name: { type: String },
  amount: { type: Number, required: true, min: 0 },
  type: { 
    type: String, 
    enum: ['doctor_settlement', 'bank_withdrawal'], 
    default: 'doctor_settlement' 
  },
  status: { 
    type: String, 
    enum: ['completed', 'processing', 'failed'], 
    default: 'completed' 
  },
  payment_method: { type: String, default: 'Bank Transfer (NEFT/RTGS/IMPS)' },
  transaction_reference: { type: String, trim: true },
  notes: { type: String, trim: true },
  settled_by: { type: String },
  settled_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ClinicSettlement || mongoose.model('ClinicSettlement', clinicSettlementSchema);
