const mongoose = require('mongoose');

const doctorConsultationSchema = new mongoose.Schema({
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctor_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor_name: { type: String, required: true },
  queue_number: { type: String },
  patient_name: { type: String, required: true, trim: true },
  patient_phone: { type: String, required: true, trim: true },
  patient_age: { type: Number },
  patient_gender: { type: String, default: 'Male' },
  language: { type: String, default: 'Bengali' },
  medicines: [
    {
      name: { type: String, required: true },
      dose: { type: String },
      unit: { type: String },
      form: { type: String },
      frequency: { type: String },
      freq_label: { type: String },
      timing: { type: String },
      food_label: { type: String },
      time_slot: { type: String },
      duration: { type: String },
      notes: { type: String },
      simplified: { type: String }
    }
  ],
  instructions: { type: String, trim: true },
  internal_notes: { type: String, trim: true },
  toggles: {
    prescription_simplifier: { type: Boolean, default: true },
    follow_up: {
      enabled: { type: Boolean, default: false },
      date: { type: String },
      time: { type: String }
    },
    vaccination: {
      enabled: { type: Boolean, default: false },
      date: { type: String }
    },
    report_review: {
      enabled: { type: Boolean, default: false },
      name: { type: String },
      date: { type: String },
      time: { type: String }
    },
    additional_instructions: {
      enabled: { type: Boolean, default: false },
      text: { type: String }
    },
    internal_notes: {
      enabled: { type: Boolean, default: false },
      text: { type: String }
    }
  },
  tags: [{ type: String }],
  cost: { type: Number, default: 0 },
  timestamp: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.DoctorConsultation || mongoose.model('DoctorConsultation', doctorConsultationSchema);
