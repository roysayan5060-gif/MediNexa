import { Response } from 'express';
import { Patient, IPatient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { ClinicalEncounter } from '../models/ClinicalEncounter';
import { Prescription } from '../models/Prescription';
import { Reminder } from '../models/Reminder';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

export const createPatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const patientData = req.body;
    const patientId = generateId('PAT');

    const newPatient = await Patient.create({
      ...patientData,
      patientId,
      status: 'active',
    });

    await logAuditEvent(req, 'CREATE_PATIENT', 'Patient', newPatient._id.toString(), {
      patientId: newPatient.patientId,
      name: `${newPatient.firstName} ${newPatient.lastName}`,
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: newPatient,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create patient', error: error.message });
  }
};

export const getPatients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string;

    const query: any = {};

    // Patient role can only see themselves
    if (req.user?.role === 'patient') {
      if (!req.user.patientId) {
        res.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
        return;
      }
      query._id = req.user.patientId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Clinic admin scope
    if (req.user?.role === 'clinic_admin' && req.user.clinicId) {
      query.clinicId = req.user.clinicId;
    }

    const skip = (page - 1) * limit;
    const [patients, total] = await Promise.all([
      Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('primaryDoctorId', 'name specialty'),
      Patient.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch patients', error: error.message });
  }
};

export const getPatientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('PAT-') ? { patientId: id } : { _id: id };

    const patient = await Patient.findOne(query).populate('primaryDoctorId', 'name specialty consultationFee');
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    // Fetch related records in parallel for comprehensive profile view
    const [appointments, encounters, prescriptions, reminders] = await Promise.all([
      Appointment.find({ patientId: patient._id }).sort({ appointmentDate: -1, startTime: -1 }).populate('doctorId', 'name specialty').limit(10),
      ClinicalEncounter.find({ patientId: patient._id }).sort({ encounterDate: -1 }).populate('doctorId', 'name specialty').limit(10),
      Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 }).populate('doctorId', 'name specialty').limit(10),
      Reminder.find({ patientId: patient._id }).sort({ dueDate: 1 }).limit(10),
    ]);

    await logAuditEvent(req, 'VIEW_PATIENT_PROFILE', 'Patient', patient._id.toString(), {
      patientId: patient.patientId,
    });

    res.json({
      success: true,
      data: {
        patient,
        appointments,
        encounters,
        prescriptions,
        reminders,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch patient details', error: error.message });
  }
};

export const updatePatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('PAT-') ? { patientId: id } : { _id: id };

    const updatedPatient = await Patient.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedPatient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    await logAuditEvent(req, 'UPDATE_PATIENT', 'Patient', updatedPatient._id.toString(), {
      patientId: updatedPatient.patientId,
    });

    res.json({
      success: true,
      message: 'Patient details updated successfully.',
      data: updatedPatient,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update patient', error: error.message });
  }
};
