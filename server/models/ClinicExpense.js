const mongoose = require('mongoose');

const clinicExpenseSchema = new mongoose.Schema({
  clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  title: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Medical Supplies', 'Utilities', 'Salaries & Staff', 'Equipment Maintenance', 'Sanitization & PPE', 'Administrative', 'Other'],
    default: 'Other'
  },
  amount: { type: Number, required: true, min: 0 },
  expense_date: { type: String, required: true },
  recorded_by: { type: String, required: true }, // Name/Email of authorized clinic user
  recorded_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, trim: true },
  receipt_ref: { type: String },
  is_recorded_expense: { type: Boolean, default: true }, // Explicitly labelled as recorded expense
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ClinicExpense || mongoose.model('ClinicExpense', clinicExpenseSchema);
