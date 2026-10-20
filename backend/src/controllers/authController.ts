import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Clinic } from '../models/Clinic';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { generateId } from '../services/idGenerator';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/auditLogger';
import { saveDatabaseSnapshot } from '../services/persistenceService';

const signToken = (id: string, role: UserRole): string => {
  const secret = process.env.JWT_SECRET || 'doctor_x_dev_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id, role }, secret, { expiresIn: expiresIn as any });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      name,
      role = 'patient',
      phone,
      // Patient fields
      dateOfBirth,
      gender,
      bloodGroup,
      privacyConsent,
      // Doctor fields
      specialty,
      registrationNumber,
      consultationFee,
      clinicId: requestedClinicId,
      // Clinic fields
      clinicName,
      ownerName,
      address,
      city,
      state,
      zipCode,
      defaultDoctorSharePercentage,
    } = req.body;

    const normalizedEmail = String(email || '').toLowerCase().trim();

    // Verify real email syntax
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address format (e.g. name@domain.com).' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const effectiveRole: UserRole =
      role === 'clinic' || role === 'clinic_admin' ? 'clinic_admin' : role;

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: effectiveRole === 'clinic_admin' ? clinicName || name : name,
      role: effectiveRole,
      phone,
    });

    // 1. Patient registration
    if (effectiveRole === 'patient') {
      const patientId = generateId('PAT');
      const nameParts = (name || 'Patient User').trim().split(' ');
      const firstName = nameParts[0] || 'Patient';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const patient = await Patient.create({
        patientId,
        userId: user._id,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: phone || 'N/A',
        gender: gender || 'other',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('1990-01-01'),
        bloodGroup: bloodGroup || 'Unknown',
        allergies: [],
        chronicConditions: [],
        medicalHistory: privacyConsent ? 'Consent acknowledged upon registration' : '',
        status: 'active',
      });

      user.patientId = patient._id;
    }

    // 2. Doctor registration
    if (effectiveRole === 'doctor') {
      const doctorId = generateId('DOC');

      // Resolve clinic association if provided, or default to first clinic if none specified
      let associatedClinic = null;
      if (requestedClinicId) {
        associatedClinic = await Clinic.findById(requestedClinicId);
      }
      if (!associatedClinic) {
        associatedClinic = await Clinic.findOne({ isActive: true });
      }

      const defaultWorkingHours = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isAvailable: true,
      }));

      const doctor = await Doctor.create({
        doctorId,
        userId: user._id,
        name,
        specialty: specialty || 'General Medicine',
        registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        consultationFee: consultationFee || 500,
        email: email.toLowerCase(),
        phone: phone || '',
        clinicId: associatedClinic ? associatedClinic._id : undefined,
        workingHours: defaultWorkingHours,
        isVerified: true,
      });

      user.doctorId = doctor._id;
      if (associatedClinic) {
        user.clinicId = associatedClinic._id;

        // Create initial clinic-doctor membership
        await ClinicDoctorMembership.create({
          clinicId: associatedClinic._id,
          doctorId: doctor._id,
          consultationFee: consultationFee || 500,
          doctorSharePercentage: associatedClinic.defaultDoctorSharePercentage || 70,
          appointmentDurationMinutes: 30,
          workingHours: doctor.workingHours,
          isActive: true,
          verificationStatus: 'verified',
        });
      }
    }

    // 3. Clinic registration
    if (effectiveRole === 'clinic_admin') {
      const clinicCode = `CLN-${Date.now().toString().slice(-4)}`;
      const clinic = await Clinic.create({
        name: clinicName || name,
        code: clinicCode,
        ownerName: ownerName || name,
        registrationNumber: registrationNumber || `REG-CLN-${Date.now().toString().slice(-6)}`,
        address: address || 'Main Medical Road',
        city: city || 'New Delhi',
        state: state || 'Delhi',
        zipCode: zipCode || '110001',
        phone: phone || '+91 9876543210',
        email: email.toLowerCase(),
        isActive: true,
        consultationFeeDefault: consultationFee || 500,
        defaultDoctorSharePercentage: defaultDoctorSharePercentage || 70,
        availableBalancePaise: 0,
      });

      user.clinicId = clinic._id;
    }

    await user.save();

    // Immediately persist user snapshot to disk
    saveDatabaseSnapshot().catch(() => {});

    const token = signToken(user._id.toString(), user.role);

    await logAuditEvent(
      { user, headers: req.headers, socket: req.socket } as any,
      'USER_REGISTER',
      'User',
      user._id.toString(),
      { role: user.role, email: user.email }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
        doctorId: user.doctorId,
        clinicId: user.clinicId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please enter your registered email and password.' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Verify valid email syntax
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address format.' });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Account not found. Please check your email or register.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect password. Please verify your credentials.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Your account is deactivated. Contact administrator.' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    // Immediately persist user snapshot to disk
    saveDatabaseSnapshot().catch(() => {});

    const token = signToken(user._id.toString(), user.role);

    await logAuditEvent(
      { user, headers: req.headers, socket: req.socket } as any,
      'USER_LOGIN_SUCCESS',
      'User',
      user._id.toString(),
      { email: user.email, role: user.role }
    );

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
        doctorId: user.doctorId,
        clinicId: user.clinicId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    let linkedProfile: any = null;
    if (req.user.role === 'patient' && req.user.patientId) {
      linkedProfile = await Patient.findById(req.user.patientId);
    } else if (req.user.role === 'doctor' && req.user.doctorId) {
      linkedProfile = await Doctor.findById(req.user.doctorId).populate('clinicId');
    } else if (req.user.role === 'clinic_admin' && req.user.clinicId) {
      linkedProfile = await Clinic.findById(req.user.clinicId);
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        patientId: req.user.patientId,
        doctorId: req.user.doctorId,
        clinicId: req.user.clinicId,
        profile: linkedProfile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve user', error: error.message });
  }
};
