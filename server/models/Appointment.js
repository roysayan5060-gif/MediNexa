const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient_name: { type: String, required: true, trim: true },
  patient_phone: { type: String, required: true, trim: true },
  patient_email: { type: String, trim: true },
  patient_age: { type: Number },
  patient_gender: { type: String, default: 'Not specified' },
  
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctor_name: { type: String, required: true },
  doctor_specialty: { type: String, required: true },
  doctor_fee: { type: Number, required: true },
  doctor_location: { type: String },
  clinic_name: { type: String },
  clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },

  appointment_date: { type: String, required: true },
  appointment_time: { type: String, required: true },
  symptoms: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending Payment', 'Confirmed', 'Completed', 'Cancelled'], 
    default: 'Confirmed' 
  },
  doctor_notes: { type: String, trim: true },
  prescription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },

  // Payment Tracking
  order_id: { type: String, trim: true },
  payment_id: { type: String, trim: true },
  payment_status: { 
    type: String, 
    enum: ['pending', 'verified', 'failed', 'refunded'], 
    default: 'verified' 
  },
  gateway_fee: { type: Number, default: 0 },

  legacy_id: { type: Number },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
