const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctor_name: { type: String, required: true },
  doctor_registration_number: { type: String },
  clinic_name: { type: String },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient_name: { type: String, required: true },
  patient_phone: { type: String, required: true },
  patient_age: { type: Number },
  patient_gender: { type: String },
  
  diagnosis: { type: String, required: true },
  medicines: [
    {
      name: { type: String, required: true },
      dosage: { type: String, default: '1 tab' },
      frequency: { type: String, default: '1-0-1' }, // Morning-Noon-Night
      timing: { type: String, default: 'After meals' },
      duration: { type: String, default: '5 days' },
      instructions: { type: String }
    }
  ],
  general_advice: { type: String },
  next_followup_date: { type: String },
  
  // WhatsApp Sharing metadata
  whatsapp_initiated: { type: Boolean, default: false },
  whatsapp_initiated_at: { type: Date },

  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);
