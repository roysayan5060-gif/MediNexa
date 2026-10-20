import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';
import { Patient } from '../models/Patient';
import { Reminder } from '../models/Reminder';
import { ClinicalEncounter } from '../models/ClinicalEncounter';
import { Prescription } from '../models/Prescription';
import { Invoice } from '../models/Invoice';
import { DoctorSettlement } from '../models/DoctorSettlement';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { AuthenticatedRequest } from '../middleware/auth';

export const getDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const specialty = req.query.specialty as string;
    const search = req.query.search as string;
    const isVerified = req.query.isVerified !== 'false';

    const query: any = {};
    if (isVerified) {
      query.isVerified = true;
    }

    if (specialty && specialty !== 'All') {
      query.specialty = { $regex: new RegExp(`^${specialty}$`, 'i') };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('clinicId', 'name city state address phone')
      .sort({ rating: -1, name: 1 });

    res.json({
      success: true,
      data: doctors,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message });
  }
};

export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('DOC-') ? { doctorId: id } : { _id: id };

    const doctor = await Doctor.findOne(query).populate('clinicId', 'name city state address phone');
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor', error: error.message });
  }
};

/**
 * Calculates available consultation slots for a doctor on a specific date.
 * Prevents double-booking by excluding existing non-cancelled appointments.
 */
export const getDoctorSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const dateStr = req.query.date as string;

    if (!dateStr) {
      res.status(400).json({ success: false, message: 'Query parameter "date" (YYYY-MM-DD) is required.' });
      return;
    }

    // Support DOC-*, MongoDB _id, or userId lookup
    let doctor = null;
    if (id.startsWith('DOC-')) {
      doctor = await Doctor.findOne({ doctorId: id });
    } else {
      doctor = await Doctor.findById(id);
      if (!doctor) {
        doctor = await Doctor.findOne({ userId: id });
      }
    }

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // Clean and parse date consistently
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDateStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1] - 1;
    const day = parts[2];

    const targetDate = new Date(year, month, day);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 1. Check doctor's personal workingHours
    let schedule = doctor.workingHours?.find((w) => w.dayOfWeek === dayOfWeek);

    // 2. If not found, check associated clinic memberships
    if (!schedule) {
      const membership = await ClinicDoctorMembership.findOne({
        doctorId: doctor._id,
        isActive: true,
      });
      if (membership && membership.workingHours?.length > 0) {
        schedule = membership.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
      }
    }

    // 3. Fallback: If no explicit schedule configured on that day, provide default consultation hours
    // (Monday-Saturday 09:00 - 17:00, Sunday 10:00 - 14:00)
    if (!schedule) {
      schedule = {
        dayOfWeek,
        startTime: dayOfWeek === 0 ? '10:00' : '09:00',
        endTime: dayOfWeek === 0 ? '14:00' : '17:00',
        slotDurationMinutes: 30,
        isAvailable: true,
      };
    }

    if (!schedule.isAvailable) {
      res.json({
        success: true,
        data: {
          doctor: { id: doctor._id, name: doctor.name, specialty: doctor.specialty },
          date: cleanDateStr,
          isAvailable: false,
          message: 'Doctor does not have scheduled consultation hours on this day.',
          slots: [],
        },
      });
      return;
    }

    // Find existing appointments on targetDate (check both local day boundary and UTC boundary)
    const localStart = new Date(year, month, day, 0, 0, 0, 0);
    const localEnd = new Date(year, month, day, 23, 59, 59, 999);
    const utcStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    const existingAppointments = await Appointment.find({
      doctorId: doctor._id,
      $or: [
        { appointmentDate: { $gte: localStart, $lte: localEnd } },
        { appointmentDate: { $gte: utcStart, $lte: utcEnd } },
      ],
      status: { $nin: ['cancelled'] },
    });

    const bookedTimes = new Set(existingAppointments.map((a) => a.startTime));

    // Generate slots
    const [startHour, startMin] = (schedule.startTime || '09:00').split(':').map(Number);
    const [endHour, endMin] = (schedule.endTime || '17:00').split(':').map(Number);
    const duration = schedule.slotDurationMinutes || 30;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const slots: Array<{
      startTime: string;
      endTime: string;
      time: string;
      isBooked: boolean;
      isAvailable: boolean;
    }> = [];

    while (currentMinutes + duration <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const slotStartM = (currentMinutes % 60).toString().padStart(2, '0');
      const slotStartTime = `${slotStartH}:${slotStartM}`;

      const slotEndH = Math.floor((currentMinutes + duration) / 60).toString().padStart(2, '0');
      const slotEndM = ((currentMinutes + duration) % 60).toString().padStart(2, '0');
      const slotEndTime = `${slotEndH}:${slotEndM}`;

      const isBooked = bookedTimes.has(slotStartTime);

      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        time: slotStartTime,
        isBooked,
        isAvailable: !isBooked,
      });

      currentMinutes += duration;
    }

    res.json({
      success: true,
      data: {
        doctor: { id: doctor._id, name: doctor.name, specialty: doctor.specialty },
        date: cleanDateStr,
        isAvailable: true,
        slots,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to calculate slots', error: error.message });
  }
};

/**
 * Returns real database statistics for the doctor's dashboard.
 * - Total registered patients
 * - Today's appointments
 * - Upcoming appointments
 * - Follow-ups due
 * - Pending report reviews / notes
 * - Recent patient activity
 */
export const getDoctorDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id ? String(req.params.id) : '';
    let doctor;

    if (!rawId || rawId === 'me' || rawId === 'dashboard' || rawId === 'undefined') {
      if (req.user?.doctorId) {
        doctor = await Doctor.findById(req.user.doctorId);
      } else {
        doctor = await Doctor.findOne({ userId: req.user?._id });
      }
    } else {
      const doctorQuery = rawId.startsWith('DOC-') ? { doctorId: rawId } : { _id: rawId };
      doctor = await Doctor.findOne(doctorQuery);
    }

    if (!doctor) {
      // Fallback: pick the first doctor in system if testing
      doctor = await Doctor.findOne();
    }

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalPatients,
      todayAppointments,
      upcomingAppointments,
      followUpsDue,
      pendingReminders,
      recentAppointments,
      recentPrescriptions,
    ] = await Promise.all([
      Patient.countDocuments({ $or: [{ primaryDoctorId: doctor._id }, { clinicId: doctor.clinicId }] }),
      Appointment.countDocuments({
        doctorId: doctor._id,
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ['confirmed', 'requested'] },
      }),
      Appointment.countDocuments({
        doctorId: doctor._id,
        appointmentDate: { $gt: todayEnd },
        status: { $in: ['confirmed', 'requested'] },
      }),
      Reminder.countDocuments({
        doctorId: doctor._id,
        type: 'follow-up',
        status: 'pending',
        dueDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      Reminder.countDocuments({
        doctorId: doctor._id,
        type: 'report-review',
        status: 'pending',
      }),
      Appointment.find({ doctorId: doctor._id })
        .sort({ appointmentDate: -1, startTime: -1 })
        .limit(6)
        .populate('patientId', 'firstName lastName patientId phone bloodGroup'),
      Prescription.find({ doctorId: doctor._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patientId', 'firstName lastName patientId'),
    ]);

    // Gather today's appointment list for direct dashboard schedule widget
    const todayAppointmentsList = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ startTime: 1 })
      .populate('patientId', 'firstName lastName patientId phone bloodGroup gender');

    res.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          todayAppointments,
          upcomingAppointments,
          followUpsDue,
          pendingReportReviews: pendingReminders,
        },
        todaySchedule: todayAppointmentsList,
        recentActivity: {
          appointments: recentAppointments,
          prescriptions: recentPrescriptions,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard stats', error: error.message });
  }
};

export const updateDoctor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const doctorQuery = id.startsWith('DOC-') ? { doctorId: id } : { _id: id };

    const doctor = await Doctor.findOneAndUpdate(doctorQuery, req.body, { new: true });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Doctor details updated successfully',
      data: doctor,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update doctor', error: error.message });
  }
};

/**
 * GET /api/doctors/earnings or /api/doctors/:id/earnings
 * Doctor earnings, fee allocation breakdown, and settlement payout history
 */
export const getDoctorEarnings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let doctor: any = null;

    if (req.params.id && req.params.id !== 'me') {
      const id = String(req.params.id);
      doctor = await Doctor.findOne(id.startsWith('DOC-') ? { doctorId: id } : { _id: id });
    } else if (req.user?.role === 'doctor') {
      if (req.user.doctorId) {
        doctor = await Doctor.findById(req.user.doctorId);
      } else {
        doctor = await Doctor.findOne({ userId: req.user._id });
      }
    }

    if (!doctor) {
      doctor = await Doctor.findOne();
    }

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }

    const [paidInvoices, settlements] = await Promise.all([
      Invoice.find({ doctorId: doctor._id, status: 'paid' })
        .populate('patientId', 'firstName lastName patientId')
        .populate('clinicId', 'name city')
        .sort({ paymentDate: -1 }),
      DoctorSettlement.find({ doctorId: doctor._id })
        .populate('clinicId', 'name city')
        .sort({ createdAt: -1 }),
    ]);

    const grossPatientFeesPaid = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const doctorEarnedTotal = paidInvoices.reduce(
      (sum, inv) => sum + (inv.doctorShareAmount || Math.round((inv.totalAmount || 0) * 0.7)),
      0
    );
    const clinicShareRetained = grossPatientFeesPaid - doctorEarnedTotal;

    const completedSettlements = settlements.filter((s) => s.status === 'paid');
    const pendingSettlements = settlements.filter((s) => s.status === 'pending' || s.status === 'approved');

    const payoutsReceived = completedSettlements.reduce((sum, s) => sum + (s.netPayableInr || 0), 0);
    const payoutsPending = pendingSettlements.reduce((sum, s) => sum + (s.netPayableInr || 0), 0);

    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor._id,
          name: doctor.name,
          specialty: doctor.specialty,
          consultationFee: doctor.consultationFee,
        },
        summary: {
          totalConsultationsCompleted: paidInvoices.length,
          grossPatientFeesPaid,
          clinicShareRetained,
          doctorEarnedTotal,
          payoutsReceived,
          payoutsPending,
          unsettledBalance: Math.max(0, doctorEarnedTotal - payoutsReceived),
        },
        recentConsultations: paidInvoices.slice(0, 10),
        settlements,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve doctor earnings', error: error.message });
  }
};
