const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const { JWT_SECRET, authenticateToken, requireRole } = require('../middleware/auth');
const { isMongoConnected, memoryStore } = require('../db');
const { verifyDoctorCredentials, isWBMCCouncil } = require('../services/doctorVerification');

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user._id || user.id, 
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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Pre-validate Doctor registration for WBMC requirements and duplicate check
    if (role === 'doctor') {
      const council = registration_authority || 'West Bengal Medical Council (WBMC)';
      if (!isWBMCCouncil(council)) {
        return res.status(400).json({
          error: 'Registration restricted: In this release, only doctors registered with the West Bengal Medical Council (WBMC) are supported. Other state medical councils are under active development.'
        });
      }

      const cleanRegNo = String(registration_number || '').trim();
      if (!cleanRegNo) {
        return res.status(400).json({ error: 'WBMC registration number is mandatory for doctor registration.' });
      }

      if (isMongoConnected()) {
        const existingDoc = await Doctor.findOne({
          registration_authority: 'West Bengal Medical Council (WBMC)',
          registration_number: cleanRegNo
        });
        if (existingDoc) {
          return res.status(409).json({
            error: `Duplicate Registration: A doctor account is already registered with WBMC license number '${cleanRegNo}'.`
          });
        }
      } else {
        const existingDoc = memoryStore.doctors.find(d => 
          d.registration_number && 
          d.registration_number.toLowerCase() === cleanRegNo.toLowerCase()
        );
        if (existingDoc) {
          return res.status(409).json({
            error: `Duplicate Registration: A doctor account is already registered with WBMC license number '${cleanRegNo}'.`
          });
        }
      }
    }

    if (isMongoConnected()) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const user = new User({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        phone,
        address,
        city
      });
      await user.save();

      let profileData = null;

      // Handle Doctor Registration
      if (role === 'doctor') {
        const cleanRegNo = String(registration_number || '').trim();
        const council = 'West Bengal Medical Council (WBMC)';

        // Verify credentials with WBMC / Emver service
        const verResult = await verifyDoctorCredentials({
          name,
          registration_number: cleanRegNo,
          registration_authority: council,
          registration_year: registration_year ? parseInt(registration_year) : undefined
        });

        const doctor = new Doctor({
          userId: user._id,
          name,
          email: user.email,
          phone: phone || '',
          specialty: specialty || 'General Medicine',
          qualification: qualification || 'MBBS',
          experience: experience ? parseInt(experience) : 1,
          fee: fee ? parseFloat(fee) : 500,
          clinic_name: clinic_name || 'Affiliated Medical Center',
          location: address || 'Kolkata Central Clinic',
          city: city || 'Kolkata',
          registration_number: cleanRegNo,
          registration_authority: council,
          registration_year: registration_year ? parseInt(registration_year) : undefined,
          verification_status: verResult.status || 'UNDER_REVIEW',
          verification_source: verResult.source || 'NONE',
          verification_notes: verResult.notes || 'Submitted for West Bengal Medical Council verification.',
          verified_at: verResult.verified_at || undefined,
          verification_audit: [{
            status: verResult.status || 'UNDER_REVIEW',
            source: verResult.source || 'NONE',
            reviewer_name: verResult.status === 'VERIFIED' ? 'Emver Automated Check' : 'System Initial Submission',
            reviewer_id: 'SYSTEM',
            timestamp: new Date(),
            notes: verResult.notes
          }]
        });
        await doctor.save();
        profileData = doctor;
      }

      // Handle Clinic Registration
      if (role === 'clinic') {
        const clinic = new Clinic({
          userId: user._id,
          clinic_name: clinic_name || name,
          license_number: license_number || 'WB/CE-PENDING',
          registration_authority: registration_authority || 'West Bengal Directorate of Health Services',
          address: address || 'Kolkata Clinical Complex',
          city: city || 'Kolkata',
          phone,
          email: user.email,
          verification_status: 'Pending Verification',
          bank_account: bank_account || {
            account_number: '',
            ifsc_code: '',
            bank_name: '',
            account_holder: name,
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
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        profile: profileData
      });

    } else {
      // Memory Store Fallback
      const existing = memoryStore.users.find(u => u.email === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const userId = `user_${Date.now()}`;
      const user = {
        _id: userId,
        id: userId,
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        phone,
        address,
        city,
        createdAt: new Date()
      };
      memoryStore.users.push(user);

      let profileData = null;

      if (role === 'doctor') {
        const cleanRegNo = String(registration_number || '').trim();
        const council = 'West Bengal Medical Council (WBMC)';

        // Verify credentials with WBMC / Emver service
        const verResult = await verifyDoctorCredentials({
          name,
          registration_number: cleanRegNo,
          registration_authority: council,
          registration_year: registration_year ? parseInt(registration_year) : undefined
        });

        const docId = `doc_${Date.now()}`;
        const doctor = {
          _id: docId,
          id: memoryStore.doctors.length + 1,
          userId,
          name,
          email: user.email,
          phone: phone || '+91 98300 00000',
          specialty: specialty || 'General Medicine',
          qualification: qualification || 'MBBS',
          experience: experience ? parseInt(experience) : 2,
          fee: fee ? parseFloat(fee) : 500,
          clinic_name: clinic_name || 'MediNexa Specialty Clinic',
          location: address || 'Park Street Area',
          city: city || 'Kolkata',
          registration_number: cleanRegNo,
          registration_authority: council,
          registration_year: registration_year ? parseInt(registration_year) : undefined,
          verification_status: verResult.status || 'UNDER_REVIEW',
          verification_source: verResult.source || 'NONE',
          verification_notes: verResult.notes || 'Submitted for West Bengal Medical Council verification.',
          verified_at: verResult.verified_at || undefined,
          verification_audit: [{
            status: verResult.status || 'UNDER_REVIEW',
            source: verResult.source || 'NONE',
            reviewer_name: verResult.status === 'VERIFIED' ? 'Emver Automated Check' : 'System Initial Submission',
            reviewer_id: 'SYSTEM',
            timestamp: new Date(),
            notes: verResult.notes
          }],
          available_days: 'Mon,Tue,Wed,Thu,Fri',
          available_hours: '10:00 AM - 05:00 PM',
          rating: 4.8,
          avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400'
        };
        memoryStore.doctors.push(doctor);
        profileData = doctor;
      }

      if (role === 'clinic') {
        const clinicId = `clinic_${Date.now()}`;
        const clinic = {
          _id: clinicId,
          id: clinicId,
          userId,
          clinic_name: clinic_name || name,
          license_number: license_number || 'WB/CE-2026/1029',
          registration_authority: registration_authority || 'West Bengal Directorate of Health Services',
          address: address || 'Central Avenue',
          city: city || 'Kolkata',
          phone,
          email: user.email,
          verification_status: 'Pending Verification',
          bank_account: bank_account || {
            account_number: '91802005612345',
            ifsc_code: 'HDFC0000123',
            bank_name: 'HDFC Bank',
            account_holder: name,
            is_verified: false
          }
        };
        memoryStore.clinics.push(clinic);
        profileData = clinic;
      }

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Account registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        profile: profileData
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server registration error: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (isMongoConnected()) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check role mismatch if specified
      if (role && user.role !== role && user.role !== 'admin') {
        return res.status(403).json({ 
          error: `This account is registered as a ${user.role}. Please log in via the ${user.role} portal.` 
        });
      }

      let profileData = null;
      if (user.role === 'doctor') {
        profileData = await Doctor.findOne({ userId: user._id });
      } else if (user.role === 'clinic') {
        profileData = await Clinic.findOne({ userId: user._id });
      }

      const token = generateToken(user);
      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        profile: profileData
      });

    } else {
      // Memory Store Fallback
      let user = memoryStore.users.find(u => u.email === email.toLowerCase());

      // If user not in memory, support instant demo accounts for quick evaluation
      if (!user) {
        const isDefaultPassword = password === 'password123' || password === 'medinexa2026';
        if (isDefaultPassword) {
          const defaultRole = role || (email.includes('doctor') ? 'doctor' : email.includes('clinic') ? 'clinic' : 'patient');
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(password, salt);
          const matchedDoc = memoryStore.doctors.find(d => d.email.toLowerCase() === email.toLowerCase());
          const matchedClinic = memoryStore.clinics.find(c => c.email.toLowerCase() === email.toLowerCase());

          let properName = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
          if (matchedDoc) properName = matchedDoc.name;
          else if (matchedClinic) properName = matchedClinic.clinic_name;

          user = {
            _id: `user_demo_${Date.now()}`,
            id: `user_demo_${Date.now()}`,
            name: properName,
            email: email.toLowerCase(),
            passwordHash,
            role: defaultRole,
            phone: (matchedDoc && matchedDoc.phone) || (matchedClinic && matchedClinic.phone) || '+91 98301 99999',
            createdAt: new Date()
          };
          memoryStore.users.push(user);
        } else {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
      } else {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
      }

      let profileData = null;
      if (user.role === 'doctor') {
        profileData = memoryStore.doctors.find(d => d.email === user.email) || memoryStore.doctors[0];
      } else if (user.role === 'clinic') {
        profileData = memoryStore.clinics.find(c => c.email === user.email) || memoryStore.clinics[0];
      }

      const token = generateToken(user);
      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        profile: profileData
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    let profile = null;

    if (isMongoConnected()) {
      const user = await User.findById(req.user.id).select('-passwordHash');
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (userRole === 'doctor') {
        profile = await Doctor.findOne({ userId: user._id });
      } else if (userRole === 'clinic') {
        profile = await Clinic.findOne({ userId: user._id });
      }

      return res.json({ user, profile });
    } else {
      const user = memoryStore.users.find(u => u._id === req.user.id || u.id === req.user.id) || {
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      };

      if (userRole === 'doctor') {
        profile = memoryStore.doctors.find(d => d.userId === req.user.id || d.email === req.user.email) || memoryStore.doctors[0];
      } else if (userRole === 'clinic') {
        profile = memoryStore.clinics.find(c => c.userId === req.user.id || c.email === req.user.email) || memoryStore.clinics[0];
      }

      return res.json({ user, profile });
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
