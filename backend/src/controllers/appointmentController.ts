import { Response } from 'express';
import { Appointment, IAppointment } from '../models/Appointment';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Invoice } from '../models/Invoice';
import { Notification } from '../models/Notification';
import { Reminder } from '../models/Reminder';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

export const createAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      patientId,
      doctorId,
      clinicId,
      appointmentDate,
      startTime,
      endTime,
      reason,
      type = 'in-person',
      notes,
    } = req.body;

    // Resolve patient (by _id, patientId, or logged-in patient session)
    let patient = null;
    if (patientId) {
      const patientQuery = String(patientId).startsWith('PAT-') ? { patientId } : { _id: patientId };
      patient = await Patient.findOne(patientQuery);
    }
    if (!patient && req.user?.role === 'patient') {
      patient = await Patient.findOne({
        $or: [
          ...(req.user.patientId ? [{ _id: req.user.patientId }] : []),
          { userId: req.user._id },
        ],
      });
    }
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient profile not found. Please ensure you are logged in.' });
      return;
    }

    // Resolve doctor (by _id or doctorId)
    let doctor = null;
    if (doctorId && doctorId !== 'me' && doctorId !== 'undefined') {
      const doctorQuery = doctorId.startsWith('DOC-') ? { doctorId } : { _id: doctorId };
      doctor = await Doctor.findOne(doctorQuery);
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

    // Role ownership check: If caller is patient, ensure they are booking for themselves
    if (req.user?.role === 'patient') {
      const isSelf =
        (req.user.patientId && req.user.patientId.toString() === patient._id.toString()) ||
        (patient.userId && patient.userId.toString() === req.user._id.toString());
      if (!isSelf) {
        res.status(403).json({ success: false, message: 'Patients can only book appointments for themselves.' });
        return;
      }
    }

    const apptDateObj = new Date(appointmentDate);
    const startOfDay = new Date(apptDateObj);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(apptDateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Conflict check: Ensure doctor does not already have an appointment at this exact slot
    const conflict = await Appointment.findOne({
      doctorId: doctor._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      status: { $nin: ['cancelled'] },
    });

    if (conflict) {
      res.status(409).json({
        success: false,
        message: `Conflict Detected: Dr. ${doctor.name} already has an active appointment at ${startTime} on ${appointmentDate}. Please select another time slot.`,
      });
      return;
    }

    // Also check if patient already has a conflicting appointment at the same date and time
    const patientConflict = await Appointment.findOne({
      patientId: patient._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      status: { $nin: ['cancelled'] },
    });

    if (patientConflict) {
      res.status(409).json({
        success: false,
        message: `Patient already has an active appointment scheduled at ${startTime} on this date.`,
      });
      return;
    }

    const appointmentId = generateId('APT');

    const appointment = await Appointment.create({
      appointmentId,
      patientId: patient._id,
      doctorId: doctor._id,
      clinicId: clinicId || doctor.clinicId,
      appointmentDate: apptDateObj,
      startTime,
      endTime,
      reason,
      type,
      notes,
      status: 'confirmed',
    });

    // Create In-App Notification for Patient (if patient has linked user account)
    if (patient.userId) {
      await Notification.create({
        userId: patient.userId,
        patientId: patient._id,
        title: 'Appointment Confirmed',
        message: `Your appointment with Dr. ${doctor.name} on ${new Date(appointmentDate).toLocaleDateString()} at ${startTime} is confirmed.`,
        type: 'appointment',
        link: `/appointments/${appointment.appointmentId}`,
      });
    }

    // Create Notification for Doctor
    if (doctor.userId) {
      await Notification.create({
        userId: doctor.userId,
        title: 'New Appointment Booked',
        message: `New appointment scheduled with ${patient.firstName} ${patient.lastName} on ${new Date(appointmentDate).toLocaleDateString()} at ${startTime}.`,
        type: 'appointment',
        link: `/doctor/appointments`,
      });
    }

    // Schedule automated reminder for the day before appointment
    const reminderDate = new Date(apptDateObj);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(9, 0, 0, 0);

    if (reminderDate > new Date()) {
      await Reminder.create({
        reminderId: generateId('REM'),
        patientId: patient._id,
        doctorId: doctor._id,
        type: 'appointment',
        title: `Upcoming Consultation with Dr. ${doctor.name}`,
        description: `Reminder for your scheduled visit on ${new Date(appointmentDate).toLocaleDateString()} at ${startTime}.`,
        dueDate: reminderDate,
        status: 'pending',
        deliveryChannel: 'in-app',
        relatedEntityId: appointment._id,
        relatedEntityType: 'Appointment',
      });
    }

    // Automatically generate consultation invoice for patient checkout
    const fee = doctor.consultationFee || 500;
    const invNumber = generateId('INV');
    const doctorShareAmount = Math.round(fee * 0.7);
    const clinicShareAmount = fee - doctorShareAmount;

    const invoice = await Invoice.create({
      invoiceNumber: invNumber,
      patientId: patient._id,
      doctorId: doctor._id,
      clinicId: clinicId || doctor.clinicId,
      appointmentId: appointment._id,
      items: [
        {
          description: `Consultation with Dr. ${doctor.name} (${doctor.specialty})`,
          unitPrice: fee,
          quantity: 1,
          total: fee,
        },
      ],
      subtotal: fee,
      totalAmount: fee,
      amountPaise: Math.round(fee * 100),
      doctorShareAmount,
      clinicShareAmount,
      status: 'pending',
      paymentMethod: 'upi_test',
      notes: `Consultation fee for Appointment ${appointment.appointmentId}`,
    });

    await logAuditEvent(req, 'CREATE_APPOINTMENT', 'Appointment', appointment._id.toString(), {
      appointmentId: appointment.appointmentId,
      patientId: patient.patientId,
      doctorId: doctor.doctorId,
      date: appointmentDate,
      time: startTime,
      invoiceNumber: invoice.invoiceNumber,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: {
        ...appointment.toObject(),
        invoice,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create appointment', error: error.message });
  }
};

export const getAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const date = req.query.date as string;

    const query: any = {};

    // Filter by caller role
    if (req.user?.role === 'patient') {
      if (!req.user.patientId) {
        res.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
        return;
      }
      query.patientId = req.user.patientId;
    } else if (req.user?.role === 'doctor') {
      if (!req.user.doctorId) {
        res.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
        return;
      }
      query.doctorId = req.user.doctorId;
    } else if (req.user?.role === 'clinic_admin' && req.user.clinicId) {
      query.clinicId = req.user.clinicId;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Specific date filter
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .sort({ appointmentDate: -1, startTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('patientId', 'firstName lastName patientId phone bloodGroup gender dateOfBirth')
        .populate('doctorId', 'name specialty consultationFee title phone')
        .populate('clinicId', 'name city state'),
      Appointment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: error.message });
  }
};

export const getAppointmentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('APT-') ? { appointmentId: id } : { _id: id };

    const appointment = await Appointment.findOne(query)
      .populate('patientId', 'firstName lastName patientId phone bloodGroup allergies chronicConditions dateOfBirth')
      .populate('doctorId', 'name specialty title consultationFee email phone')
      .populate('clinicId', 'name address city state phone');

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointment', error: error.message });
  }
};

export const updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, cancellationReason } = req.body;

    const query = id.startsWith('APT-') ? { appointmentId: id } : { _id: id };
    const appointment = await Appointment.findOne(query);

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    appointment.status = status;
    if (status === 'cancelled') {
      appointment.cancellationReason = cancellationReason || 'Cancelled by user';
      appointment.cancelledBy = req.user?._id;
    }

    await appointment.save();

    await logAuditEvent(req, 'UPDATE_APPOINTMENT_STATUS', 'Appointment', appointment._id.toString(), {
      status,
      cancellationReason,
    });

    res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: appointment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update appointment status', error: error.message });
  }
};
