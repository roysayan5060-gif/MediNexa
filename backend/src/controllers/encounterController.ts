import { Response } from 'express';
import { ClinicalEncounter } from '../models/ClinicalEncounter';
import { Appointment } from '../models/Appointment';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

export const createEncounter = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      vitals,
      chiefComplaints,
      historyOfPresentIllness,
      physicalExamination,
      diagnosis,
      clinicalNotes,
      followUpPlan,
      status = 'finalized',
    } = req.body;

    const patient = await Patient.findOne(patientId.startsWith('PAT-') ? { patientId } : { _id: patientId });
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    let doctor = null;
    if (doctorId && doctorId !== 'me' && doctorId !== 'undefined') {
      const docQuery = doctorId.startsWith('DOC-') ? { doctorId } : { _id: doctorId };
      doctor = await Doctor.findOne(docQuery);
    }
    if (!doctor && req.user?.role === 'doctor') {
      if (req.user.doctorId) {
        doctor = await Doctor.findById(req.user.doctorId);
      } else {
        doctor = await Doctor.findOne({ userId: req.user._id });
      }
    }

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const encounterId = generateId('ENC');

    const encounter = await ClinicalEncounter.create({
      encounterId,
      appointmentId: appointmentId || undefined,
      patientId: patient._id,
      doctorId: doctor._id,
      vitals,
      chiefComplaints,
      historyOfPresentIllness,
      physicalExamination,
      diagnosis,
      clinicalNotes,
      followUpPlan,
      status,
      encounterDate: new Date(),
    });

    // If linked to an appointment, mark appointment as completed
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'completed' });
    }

    await logAuditEvent(req, 'CREATE_CLINICAL_ENCOUNTER', 'ClinicalEncounter', encounter._id.toString(), {
      encounterId: encounter.encounterId,
      patientId: patient.patientId,
      diagnosis,
    });

    res.status(201).json({
      success: true,
      message: 'Clinical encounter saved successfully.',
      data: encounter,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create clinical encounter', error: error.message });
  }
};

export const getEncounters = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId } = req.query;
    const query: any = {};

    if (req.user?.role === 'patient') {
      if (!req.user.patientId) {
        res.json({ success: true, data: [] });
        return;
      }
      query.patientId = req.user.patientId;
    } else if (patientId) {
      const patient = await Patient.findOne(
        patientId.toString().startsWith('PAT-') ? { patientId } : { _id: patientId }
      );
      if (patient) query.patientId = patient._id;
    }

    if (req.user?.role === 'doctor') {
      query.doctorId = req.user.doctorId;
    } else if (doctorId) {
      const doctor = await Doctor.findOne(
        doctorId.toString().startsWith('DOC-') ? { doctorId } : { _id: doctorId }
      );
      if (doctor) query.doctorId = doctor._id;
    }

    const encounters = await ClinicalEncounter.find(query)
      .sort({ encounterDate: -1 })
      .populate('patientId', 'firstName lastName patientId dateOfBirth gender bloodGroup')
      .populate('doctorId', 'name specialty title');

    res.json({
      success: true,
      data: encounters,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch clinical encounters', error: error.message });
  }
};

export const getEncounterById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('ENC-') ? { encounterId: id } : { _id: id };

    const encounter = await ClinicalEncounter.findOne(query)
      .populate('patientId', 'firstName lastName patientId dateOfBirth gender bloodGroup allergies chronicConditions')
      .populate('doctorId', 'name specialty title registrationNumber phone email');

    if (!encounter) {
      res.status(404).json({ success: false, message: 'Clinical encounter not found' });
      return;
    }

    res.json({
      success: true,
      data: encounter,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch encounter', error: error.message });
  }
};
