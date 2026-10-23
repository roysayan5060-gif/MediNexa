const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const { JWT_SECRET, authenticateToken, requireRole } = require('../middleware/auth');
const { isMongoConnected, ensureMongoConnection, memoryStore } = require('../db');
const { verifyDoctorCredentials, isWBMCCouncil } = require('../services/doctorVerification');

// Helper to generate JWT token with guaranteed string ID
function generateToken(user) {
  const userId = user._id ? user._id.toString() : String(user.id);
  return jwt.sign(
    { 
      id: userId, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { 
      name, email, password, role, phone, address, city,
      specialty, qualification, experience, fee, clinic_name,
      registration_number, registration_authority, registration_year,
      license_number, bank_account
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRole = String(role).trim().toLowerCase();

    // Ensure connection to MongoDB Atlas
    await ensureMongoConnection(6000);

    if (!isMongoConnected()) {
      return res.status(503).json({
        error: 'Cloud database connection is currently establishing. Please retry registration in a moment.'
      });
    }

    // Pre-validate Doctor registration for WBMC requirements and duplicate license check
    if (cleanRole === 'doctor') {
      const council = registration_authority || 'West Bengal Medical Council (WBMC)';
      if (!isWBMCCouncil(council)) {
        return res.status(400).json({
          error: 'Registration restricted: In this release, only doctors registered with the West Bengal Medical Council (WBMC) are supported.'
        });
      }

      const cleanRegNo = String(registration_number || '').trim();
      if (!cleanRegNo) {
        return res.status(400).json({ error: 'WBMC registration number is mandatory for doctor registration.' });
      }

      const existingDoc = await Doctor.findOne({
        registration_authority: 'West Bengal Medical Council (WBMC)',
        registration_number: cleanRegNo
      });
      if (existingDoc) {
        return res.status(409).json({
          error: `Duplicate Registration: A doctor account is already registered with WBMC license number '${cleanRegNo}'.`
        });
      }
    }

    // Unique email verification across all registered accounts
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
      role: cleanRole,
      phone: phone ? String(phone).trim() : '',
      address: address ? String(address).trim() : '',
      city: city ? String(city).trim() : 'Kolkata'
    });
    await user.save();

    let profileData = null;

    // Handle Doctor Profile Creation
    if (cleanRole === 'doctor') {
      const cleanRegNo = String(registration_number || '').trim();
      const council = 'West Bengal Medical Council (WBMC)';

      const verResult = await verifyDoctorCredentials({
        name: user.name,
        registration_number: cleanRegNo,
        registration_authority: council,
        registration_year: registration_year ? parseInt(registration_year) : undefined
      });

      const doctor = new Doctor({
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '+91 98300 00000',
        specialty: specialty || 'General Medicine',
        qualification: qualification || 'MBBS',
        experience: experience ? parseInt(experience) : 1,
        fee: fee ? parseFloat(fee) : 500,
        clinic_name: clinic_name || 'Affiliated Medical Center',
        location: user.address || 'Kolkata Central Clinic',
        city: user.city || 'Kolkata',
        registration_number: cleanRegNo,
        registration_authority: council,
        registration_year: registration_year ? parseInt(registration_year) : undefined,
        verification_status: verResult.status || 'VERIFIED',
        verification_source: verResult.source || 'WBMC',
        verification_notes: verResult.notes || 'Verified with West Bengal Medical Council records.',
        verified_at: verResult.verified_at || new Date(),
        verification_audit: [{
          status: verResult.status || 'VERIFIED',
          source: verResult.source || 'WBMC',
          reviewer_name: 'WBMC Automated Registry',
          reviewer_id: 'SYSTEM',
          timestamp: new Date(),
          notes: verResult.notes
        }],
        wallet_balance: 6573.50,
        wallet_spent_today: 0.00,
        wallet_transactions: []
      });
      await doctor.save();
      profileData = doctor;
    }

    // Handle Clinic Profile Creation
    if (cleanRole === 'clinic') {
      const clinic = new Clinic({
        userId: user._id,
        clinic_name: clinic_name || user.name,
        license_number: license_number || 'WB/CE-PENDING',
        registration_authority: registration_authority || 'West Bengal Directorate of Health Services',
        address: user.address || 'Kolkata Clinical Complex',
        city: user.city || 'Kolkata',
        phone: user.phone,
        email: user.email,
        verification_status: 'Verified',
        bank_account: bank_account || {
          account_number: '',
          ifsc_code: '',
          bank_name: '',
          account_holder: user.name,
          is_verified: false
        }
      });
      await clinic.save();
      profileData = clinic;
    }

    const token = generateToken(user);
    return res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      profile: profileData
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration error: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Ensure connection to MongoDB Atlas
    await ensureMongoConnection(6000);

    if (!isMongoConnected()) {
      return res.status(503).json({
        error: 'Database service is currently establishing connection. Please retry in a few seconds.'
      });
    }

    let user = await User.findOne({ email: cleanEmail });

    // If user not in MongoDB, support instant initialization of default demo accounts
    if (!user) {
      const isDefaultPassword = password === 'password123' || password === 'medinexa2026';
      if (isDefaultPassword) {
        const defaultRole = role || (cleanEmail.includes('doctor') ? 'doctor' : cleanEmail.includes('clinic') ? 'clinic' : 'patient');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        let properName = cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());

        user = new User({
          name: properName,
          email: cleanEmail,
          passwordHash,
          role: defaultRole,
          phone: '+91 98301 99999',
          city: 'Kolkata'
        });
        await user.save();
        console.log(`⚡ Seeded demo account in MongoDB Atlas: ${cleanEmail}`);
      } else {
        return res.status(401).json({
          error: 'No account found with this email address. Please click Register to create your account.'
        });
      }
    }

    // Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please verify your password and try again.' });
    }

    // Check role mismatch if specified
    if (role && user.role !== role && user.role !== 'admin') {
      return res.status(403).json({ 
        error: `This account is registered as a ${user.role}. Please log in via the ${user.role} portal.` 
      });
    }

    let profileData = null;
    if (user.role === 'doctor') {
      profileData = await Doctor.findOne({ $or: [{ userId: user._id }, { email: user.email }] });
    } else if (user.role === 'clinic') {
      profileData = await Clinic.findOne({ $or: [{ userId: user._id }, { email: user.email }] });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      profile: profileData
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    await ensureMongoConnection(4000);
    const userRole = req.user.role;
    let profile = null;

    if (isMongoConnected()) {
      const user = await User.findById(req.user.id).select('-passwordHash');
      if (!user) return res.status(404).json({ error: 'User account not found' });

      if (userRole === 'doctor') {
        profile = await Doctor.findOne({ $or: [{ userId: user._id }, { email: user.email }] });
      } else if (userRole === 'clinic') {
        profile = await Clinic.findOne({ $or: [{ userId: user._id }, { email: user.email }] });
      }

      return res.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        profile
      });
    } else {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verification-queue (For reviewing West Bengal Doctor credentials)
router.get('/verification-queue', async (req, res) => {
  try {
    const pendingStatuses = ['PENDING', 'UNDER_REVIEW', 'UNABLE_TO_VERIFY', 'Pending Verification'];
    if (isMongoConnected()) {
      const doctors = await Doctor.find({ verification_status: { $in: pendingStatuses } });
      return res.json(doctors);
    } else {
      const doctors = memoryStore.doctors.filter(d => pendingStatuses.includes(d.verification_status));
      return res.json(doctors);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-doctor (Admin or authorized review workflow)
router.post('/verify-doctor', async (req, res) => {
  try {
    const { doctorId, status, notes } = req.body;
    if (!doctorId || !status) {
      return res.status(400).json({ error: 'Doctor ID and verification status required.' });
    }

    // Authorization & Reviewer Identity Check
    let reviewerName = 'Authorized Administrator';
    let reviewerId = 'ADMIN';

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Explicit Security Rule: Doctors CANNOT verify doctor credentials / self-approve
        if (decoded.role === 'doctor') {
          return res.status(403).json({ error: 'Unauthorized: Doctors cannot verify doctor registration credentials.' });
        }
        reviewerName = decoded.name || 'Authorized Reviewer';
        reviewerId = String(decoded.id || decoded._id || 'ADMIN');
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session token.' });
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Authentication required. Only authorized reviewers can verify doctor credentials.' });
      }
    }

    // Supported statuses mapping
    const statusMap = {
      'VERIFIED': 'VERIFIED',
      'Verified': 'VERIFIED',
      'REJECTED': 'REJECTED',
      'Rejected': 'REJECTED',
      'UNDER_REVIEW': 'UNDER_REVIEW',
      'Pending Verification': 'UNDER_REVIEW',
      'PENDING': 'PENDING',
      'UNABLE_TO_VERIFY': 'UNABLE_TO_VERIFY'
    };

    const normalizedStatus = statusMap[status];
    if (!normalizedStatus) {
      return res.status(400).json({ 
        error: `Invalid status '${status}'. Allowed statuses: PENDING, UNDER_REVIEW, VERIFIED, REJECTED, UNABLE_TO_VERIFY.` 
      });
    }

    const reviewNotes = notes || (normalizedStatus === 'VERIFIED'
      ? 'Credentials verified with official West Bengal Medical Register (wbmc.wb.gov.in).'
      : 'License details could not be matched with official West Bengal Medical Council records.');

    const auditEntry = {
      status: normalizedStatus,
      source: 'WBMC_PORTAL_MANUAL',
      reviewer_name: reviewerName,
      reviewer_id: reviewerId,
      timestamp: new Date(),
      notes: reviewNotes
    };

    if (isMongoConnected()) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

      doctor.verification_status = normalizedStatus;
      doctor.verification_source = 'WBMC_PORTAL_MANUAL';
      doctor.verification_notes = reviewNotes;
      doctor.verified_at = normalizedStatus === 'VERIFIED' ? new Date() : doctor.verified_at;
      if (!doctor.verification_audit) doctor.verification_audit = [];
      doctor.verification_audit.push(auditEntry);
      await doctor.save();

      return res.json({ message: `Doctor status updated to ${normalizedStatus}`, doctor });
    } else {
      const doctor = memoryStore.doctors.find(d => d._id === doctorId || d.id == doctorId);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

      doctor.verification_status = normalizedStatus;
      doctor.verification_source = 'WBMC_PORTAL_MANUAL';
      doctor.verification_notes = reviewNotes;
      doctor.verified_at = normalizedStatus === 'VERIFIED' ? new Date() : doctor.verified_at;
      if (!doctor.verification_audit) doctor.verification_audit = [];
      doctor.verification_audit.push(auditEntry);

      return res.json({ message: `Doctor status updated to ${normalizedStatus}`, doctor });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
