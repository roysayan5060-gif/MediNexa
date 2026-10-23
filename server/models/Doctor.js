const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true },
  specialty: { type: String, required: true, trim: true },
  qualification: { type: String, trim: true, default: 'MBBS' },
  experience: { type: Number, default: 1 },
  fee: { type: Number, required: true, min: 0 },
  clinic_name: { type: String, trim: true },
  clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  location: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  avatar: { type: String, trim: true },
  bio: { type: String, trim: true },
  available_days: { type: String, default: 'Mon,Tue,Wed,Thu,Fri' },
  available_hours: { type: String, default: '09:00 AM - 05:00 PM' },
  rating: { type: Number, default: 4.8 },

  // West Bengal & National Medical Register Verification
  registration_number: { type: String, trim: true }, // e.g. WBMC-74921 (preserves leading zeros)
  registration_authority: { 
    type: String, 
    trim: true, 
    default: 'West Bengal Medical Council (WBMC)' 
  },
  registration_year: { type: Number, min: 1950, max: 2026 },
  verification_status: { 
    type: String, 
    enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'UNABLE_TO_VERIFY', 'Pending Verification', 'Verified', 'Rejected'], 
    default: 'PENDING' 
  },
  verification_source: { type: String, default: 'NONE' },
  verification_notes: { type: String, trim: true },
  verified_at: { type: Date },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verification_audit: [{
    status: { type: String },
    source: { type: String },
    reviewer_name: { type: String },
    reviewer_id: { type: String },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String }
  }],
  
  // Financial balance & settlements for doctor
  total_earnings: { type: Number, default: 0 },
  pending_payout: { type: Number, default: 0 },
  completed_payouts: { type: Number, default: 0 },

  legacy_id: { type: Number }, // For seamless SQLite backward-compatibility
  created_at: { type: Date, default: Date.now }
});

// Anti-duplicate constraint: prevents multiple doctor accounts from claiming the same registration number in the same council
doctorSchema.index({ registration_authority: 1, registration_number: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
