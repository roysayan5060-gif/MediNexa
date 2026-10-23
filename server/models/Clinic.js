const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clinic_name: { type: String, required: true, trim: true },
  license_number: { type: String, trim: true },
  registration_authority: { type: String, default: 'West Bengal Directorate of Health Services (CE Act)' },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  verification_status: { 
    type: String, 
    enum: ['Pending Verification', 'Verified', 'Rejected'], 
    default: 'Verified' 
  },
  
  // Real Bank Account for settlements (never simulate funds into bank without real settlement)
  bank_account: {
    account_number: { type: String, trim: true },
    ifsc_code: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    account_holder: { type: String, trim: true },
    is_verified: { type: Boolean, default: false }
  },

  affiliated_doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);
