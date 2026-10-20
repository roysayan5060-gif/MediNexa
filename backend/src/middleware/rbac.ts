import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../models/User';
import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';

/**
 * Restricts access to specified roles.
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Your role '${req.user.role}' lacks permission for this action.`,
      });
      return;
    }

    next();
  };
};

/**
 * Ensures a patient can only read/write their own records,
 * while authorized doctors, clinic admins, or platform admins have care-relationship access.
 */
export const verifyPatientRecordAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Platform admin has platform-level authorized oversight
    if (user.role === 'platform_admin') {
      return next();
    }

    const requestedPatientId = req.params.patientId || req.params.id || req.body.patientId || req.query.patientId;
    if (!requestedPatientId) {
      return next();
    }

    // Find the patient record (could be MongoDB ObjectId or server generated string ID)
    const query = requestedPatientId.toString().startsWith('PAT-')
      ? { patientId: requestedPatientId }
      : { _id: requestedPatientId };

    const patient = await Patient.findOne(query);
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient record not found.' });
      return;
    }

    // If caller is a patient, must match their own linked patient ID or user ID
    if (user.role === 'patient') {
      const isOwner =
        (user.patientId && user.patientId.toString() === patient._id.toString()) ||
        (patient.userId && patient.userId.toString() === user._id.toString());

      if (!isOwner) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: You are not authorized to view another patient\'s medical records.',
        });
        return;
      }
    }

    // If caller is a doctor, verify care relationship (either doctor is primary doctor or has an appointment/encounter with this patient)
    if (user.role === 'doctor') {
      if (patient.primaryDoctorId && user.doctorId && patient.primaryDoctorId.toString() === user.doctorId.toString()) {
        return next();
      }
      // Check if there is any scheduled/past appointment or consultation between doctor and patient
      const hasRelationship = await Appointment.exists({
        patientId: patient._id,
        doctorId: user.doctorId,
      });

      // Also allow if doctor is in the same clinic
      const sameClinic = patient.clinicId && user.clinicId && patient.clinicId.toString() === user.clinicId.toString();

      if (!hasRelationship && !sameClinic) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: You do not have an active care relationship with this patient.',
        });
        return;
      }
    }

    // If clinic admin, check if patient belongs to the same clinic
    if (user.role === 'clinic_admin') {
      if (user.clinicId && patient.clinicId && user.clinicId.toString() !== patient.clinicId.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access Denied: Patient is registered with a different clinic.',
        });
        return;
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error checking access permissions', error: error.message });
  }
};
