import { Request, Response } from 'express';
import { Clinic, IClinic } from '../models/Clinic';
import { Doctor } from '../models/Doctor';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { Appointment } from '../models/Appointment';
import { Invoice } from '../models/Invoice';
import { DoctorSettlement } from '../models/DoctorSettlement';
import { FinancialLedgerEntry } from '../models/FinancialLedger';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

// Helper to resolve the active clinic for the request
const resolveClinicId = async (req: AuthenticatedRequest, requestedClinicId?: any) => {
  const idStr = requestedClinicId ? String(requestedClinicId) : undefined;
  if (idStr && idStr !== 'current' && idStr !== 'undefined') {
    return idStr;
  }
  if (req.user?.clinicId) {
    return req.user.clinicId;
  }
  // Fallback to first clinic
  const clinic = await Clinic.findOne({ isActive: true });
  return clinic ? clinic._id : null;
};

/**
 * GET /api/clinics
 * List all active clinics (for public/patient directory and search)
 */
export const getClinics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, city, state } = req.query;
    const query: any = { isActive: true };

    if (city) query.city = { $regex: new RegExp(`^${city}$`, 'i') };
    if (state) query.state = { $regex: new RegExp(`^${state}$`, 'i') };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const clinics = await Clinic.find(query).sort({ name: 1 });

    // Fetch doctors count and specialties for each clinic
    const clinicsWithDetails = await Promise.all(
      clinics.map(async (c) => {
        const memberships = await ClinicDoctorMembership.find({
          clinicId: c._id,
          isActive: true,
        }).populate('doctorId', 'name specialty consultationFee rating isVerified');

        const doctors = memberships.map((m: any) => ({
          membershipId: m._id,
          doctor: m.doctorId,
          consultationFee: m.consultationFee,
          workingHours: m.workingHours,
          doctorSharePercentage: m.doctorSharePercentage,
        }));

        return {
          ...c.toObject(),
          doctorCount: doctors.length,
          doctors,
        };
      })
    );

    res.json({
      success: true,
      data: clinicsWithDetails,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch clinics', error: error.message });
  }
};

/**
 * GET /api/clinics/:id
 * Retrieve a specific clinic and its associated doctors & schedules
 */
export const getClinicById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const clinic = await Clinic.findById(id);
    if (!clinic) {
      res.status(404).json({ success: false, message: 'Clinic not found' });
      return;
    }

    const memberships = await ClinicDoctorMembership.find({
      clinicId: clinic._id,
    }).populate('doctorId');

    res.json({
      success: true,
      data: {
        clinic,
        memberships,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch clinic', error: error.message });
  }
};

/**
 * PUT /api/clinics/:id
 * Update clinic profile, settings, and bank details
 */
export const updateClinic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    if (!clinicId) {
      res.status(404).json({ success: false, message: 'Clinic not found' });
      return;
    }

    const clinic = await Clinic.findByIdAndUpdate(clinicId, req.body, { new: true });
    res.json({
      success: true,
      message: 'Clinic profile updated successfully',
      data: clinic,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update clinic', error: error.message });
  }
};

/**
 * GET /api/clinics/:id/dashboard-overview
 * Live, database-derived operational & financial metrics for Clinic Dashboard
 */
export const getClinicDashboardOverview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    if (!clinicId) {
      res.status(404).json({ success: false, message: 'Clinic not found' });
      return;
    }

    const clinic = await Clinic.findById(clinicId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      todayAppointments,
      completedConsultations,
      pendingAppointments,
      todayQueue,
      paidInvoices,
      pendingInvoices,
      refundedInvoices,
      pendingSettlements,
      paidSettlements,
      affiliatedDoctorsCount,
    ] = await Promise.all([
      // Today's appointments count
      Appointment.countDocuments({
        clinicId,
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
      }),
      // Completed consultations
      Appointment.countDocuments({
        clinicId,
        status: 'completed',
      }),
      // Pending / confirmed upcoming appointments
      Appointment.countDocuments({
        clinicId,
        status: { $in: ['confirmed', 'requested'] },
      }),
      // Today's appointment queue for reception desk
      Appointment.find({
        clinicId,
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
      })
        .populate('patientId', 'firstName lastName patientId phone bloodGroup')
        .populate('doctorId', 'name specialty')
        .sort({ startTime: 1 }),
      // Paid invoices
      Invoice.find({ clinicId, status: 'paid' }),
      // Pending invoices
      Invoice.find({ clinicId, status: 'pending' }),
      // Refunded invoices
      Invoice.find({ clinicId, status: 'refunded' }),
      // Doctor settlements pending
      DoctorSettlement.find({ clinicId, status: { $in: ['pending', 'approved'] } }),
      // Doctor settlements paid
      DoctorSettlement.find({ clinicId, status: 'paid' }),
      // Number of doctors affiliated
      ClinicDoctorMembership.countDocuments({ clinicId, isActive: true }),
    ]);

    // Financial calculations
    const totalPatientPaymentsReceived = paidInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );
    const paymentsAwaitingConfirmation = pendingInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );
    const refundsTotal = refundedInvoices.reduce(
      (sum, inv) => sum + (inv.refundAmount || inv.totalAmount || 0),
      0
    );
    const doctorSettlementsPendingTotal = pendingSettlements.reduce(
      (sum, s) => sum + (s.netPayableInr || 0),
      0
    );
    const doctorSettlementsCompletedTotal = paidSettlements.reduce(
      (sum, s) => sum + (s.netPayableInr || 0),
      0
    );

    // Available clinic balance = (Total Collected - Refunds - Doctor Settlements Paid - Gateway charges)
    const availableClinicBalance = Math.max(
      0,
      totalPatientPaymentsReceived - refundsTotal - doctorSettlementsCompletedTotal
    );

    res.json({
      success: true,
      data: {
        clinic,
        metrics: {
          todayAppointments,
          completedConsultations,
          pendingAppointments,
          affiliatedDoctorsCount,
          totalPatientPaymentsReceived,
          paymentsAwaitingConfirmation,
          refundsTotal,
          doctorSettlementsPendingTotal,
          doctorSettlementsCompletedTotal,
          availableClinicBalance,
        },
        todayQueue,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve clinic overview', error: error.message });
  }
};

/**
 * GET /api/clinics/:id/doctors
 * Get all doctors associated with this clinic, including their custom schedule & fee split
 */
export const getClinicDoctors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    const memberships = await ClinicDoctorMembership.find({ clinicId })
      .populate('doctorId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: memberships,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch clinic doctors', error: error.message });
  }
};

/**
 * POST /api/clinics/:id/doctors
 * Associate a doctor to the clinic with working hours, consultation fee, and split %
 */
export const addDoctorToClinic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    const {
      doctorId,
      consultationFee = 500,
      doctorSharePercentage = 70,
      appointmentDurationMinutes = 30,
      workingHours = [],
      breakTimes = [],
      holidays = [],
    } = req.body;

    const doctor = await Doctor.findOne(
      doctorId.startsWith('DOC-') ? { doctorId } : { _id: doctorId }
    );
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // Upsert clinic doctor membership
    let membership = await ClinicDoctorMembership.findOne({ clinicId, doctorId: doctor._id });
    if (membership) {
      membership.consultationFee = consultationFee;
      membership.doctorSharePercentage = doctorSharePercentage;
      membership.appointmentDurationMinutes = appointmentDurationMinutes;
      membership.workingHours = workingHours.length > 0 ? workingHours : doctor.workingHours;
      membership.breakTimes = breakTimes;
      membership.holidays = holidays;
      membership.isActive = true;
      await membership.save();
    } else {
      membership = await ClinicDoctorMembership.create({
        clinicId,
        doctorId: doctor._id,
        consultationFee,
        doctorSharePercentage,
        appointmentDurationMinutes,
        workingHours: workingHours.length > 0 ? workingHours : doctor.workingHours,
        breakTimes,
        holidays,
        isActive: true,
      });
    }

    // Also link doctor's primary clinicId if not set
    if (!doctor.clinicId && clinicId) {
      doctor.clinicId = clinicId as any;
      await doctor.save();
    }

    await logAuditEvent(req, 'CLINIC_ADD_DOCTOR', 'ClinicDoctorMembership', membership._id.toString(), {
      clinicId,
      doctorId: doctor._id,
      consultationFee,
      doctorSharePercentage,
    });

    res.status(201).json({
      success: true,
      message: `Dr. ${doctor.name} successfully associated with clinic.`,
      data: membership,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add doctor to clinic', error: error.message });
  }
};

/**
 * PUT /api/clinics/:id/doctors/:membershipId
 * Update doctor's clinic schedule, consultation fee, or fee split
 */
export const updateClinicDoctorSchedule = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { membershipId } = req.params;
    const {
      consultationFee,
      doctorSharePercentage,
      appointmentDurationMinutes,
      workingHours,
      breakTimes,
      holidays,
      isActive,
    } = req.body;

    const membership = await ClinicDoctorMembership.findByIdAndUpdate(
      membershipId,
      {
        ...(consultationFee !== undefined && { consultationFee }),
        ...(doctorSharePercentage !== undefined && { doctorSharePercentage }),
        ...(appointmentDurationMinutes !== undefined && { appointmentDurationMinutes }),
        ...(workingHours !== undefined && { workingHours }),
        ...(breakTimes !== undefined && { breakTimes }),
        ...(holidays !== undefined && { holidays }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    ).populate('doctorId');

    if (!membership) {
      res.status(404).json({ success: false, message: 'Doctor membership not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Doctor schedule and fee arrangement updated successfully.',
      data: membership,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update doctor schedule', error: error.message });
  }
};

/**
 * GET /api/clinics/:id/financial-ledger
 * Immutable financial ledger tracking all patient collections, gateway fees,
 * refunds, doctor settlements, and bank transfers
 */
export const getClinicFinancialLedger = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    const { type, direction, status, search } = req.query;

    const query: any = { clinicId };
    if (type && type !== 'all') query.type = type;
    if (direction && direction !== 'all') query.direction = direction;
    if (status && status !== 'all') query.status = status;

    const entries = await FinancialLedgerEntry.find(query)
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'name specialty')
      .populate('invoiceId', 'invoiceNumber totalAmount paymentMethod')
      .limit(100);

    // Summary calculations
    const allEntries = await FinancialLedgerEntry.find({ clinicId });
    const totalCreditsPaise = allEntries
      .filter((e) => e.direction === 'credit' && e.status !== 'reversed')
      .reduce((sum, e) => sum + e.amountPaise, 0);

    const totalDebitsPaise = allEntries
      .filter((e) => e.direction === 'debit' && e.status !== 'reversed')
      .reduce((sum, e) => sum + e.amountPaise, 0);

    const currentBalancePaise = Math.max(0, totalCreditsPaise - totalDebitsPaise);

    res.json({
      success: true,
      data: {
        entries,
        summary: {
          totalCreditsInr: totalCreditsPaise / 100,
          totalDebitsInr: totalDebitsPaise / 100,
          currentBalanceInr: currentBalancePaise / 100,
          currentBalancePaise,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve financial ledger', error: error.message });
  }
};

/**
 * GET /api/clinics/:id/settlements
 * List doctor settlements (pending, approved, paid)
 */
export const getDoctorSettlements = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    const { status, doctorId } = req.query;

    const query: any = { clinicId };
    if (status && status !== 'all') query.status = status;
    if (doctorId && doctorId !== 'all') query.doctorId = doctorId;

    const settlements = await DoctorSettlement.find(query)
      .sort({ createdAt: -1 })
      .populate('doctorId', 'name specialty phone email registrationNumber')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      data: settlements,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch settlements', error: error.message });
  }
};

/**
 * POST /api/clinics/:id/settlements/preview
 * Preview unsettled completed consultations for doctors and calculate the fee split
 */
export const previewDoctorSettlements = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    const { doctorId } = req.body;

    const invoiceQuery: any = {
      clinicId,
      status: 'paid',
      settlementStatus: 'unsettled',
    };
    if (doctorId) invoiceQuery.doctorId = doctorId;

    const unsettledInvoices = await Invoice.find(invoiceQuery)
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'name specialty consultationFee')
      .populate('appointmentId', 'appointmentDate startTime');

    // Group invoices by doctor
    const doctorMap: Record<string, any> = {};

    for (const inv of unsettledInvoices) {
      if (!inv.doctorId) continue;
      const docId = (inv.doctorId as any)._id.toString();

      if (!doctorMap[docId]) {
        // Find agreed split from ClinicDoctorMembership
        const membership = await ClinicDoctorMembership.findOne({
          clinicId,
          doctorId: (inv.doctorId as any)._id,
        });

        const splitPercentage = membership ? membership.doctorSharePercentage : 70;

        doctorMap[docId] = {
          doctor: inv.doctorId,
          splitPercentage,
          invoices: [],
          totalGrossPaid: 0,
          doctorShareTotal: 0,
          clinicShareTotal: 0,
        };
      }

      const invTotal = inv.totalAmount || 0;
      const docShare = Math.round((invTotal * doctorMap[docId].splitPercentage) / 100);
      const clinicShare = invTotal - docShare;

      doctorMap[docId].invoices.push({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        patient: inv.patientId,
        appointment: inv.appointmentId,
        totalAmount: invTotal,
        docShare,
        clinicShare,
        paymentDate: inv.paymentDate || inv.createdAt,
      });

      doctorMap[docId].totalGrossPaid += invTotal;
      doctorMap[docId].doctorShareTotal += docShare;
      doctorMap[docId].clinicShareTotal += clinicShare;
    }

    res.json({
      success: true,
      data: Object.values(doctorMap),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to preview settlements', error: error.message });
  }
};

/**
 * POST /api/clinics/:id/settlements/create-batch
 * Create or approve a doctor settlement batch
 */
export const createDoctorSettlement = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const clinicId = await resolveClinicId(req, req.params.id);
    const { doctorId, invoiceIds, adjustmentsInr = 0, notes } = req.body;

    if (!doctorId || !invoiceIds || invoiceIds.length === 0) {
      res.status(400).json({ success: false, message: 'Doctor ID and invoice IDs are required.' });
      return;
    }

    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      clinicId,
      status: 'paid',
      settlementStatus: 'unsettled',
    });

    if (invoices.length === 0) {
      res.status(400).json({ success: false, message: 'No eligible unsettled invoices found.' });
      return;
    }

    const membership = await ClinicDoctorMembership.findOne({ clinicId, doctorId });
    const doctorSharePercentage = membership ? membership.doctorSharePercentage : 70;

    const totalPatientPaidInr = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const doctorShareInr = Math.round((totalPatientPaidInr * doctorSharePercentage) / 100);
    const clinicShareInr = totalPatientPaidInr - doctorShareInr;
    const netPayableInr = Math.max(0, doctorShareInr - adjustmentsInr);
    const netPayablePaise = Math.round(netPayableInr * 100);

    const settlementId = generateId('SET');
    const appointmentIds = invoices.map((inv) => inv.appointmentId).filter(Boolean);

    const settlement = await DoctorSettlement.create({
      settlementId,
      clinicId,
      doctorId,
      invoiceIds: invoices.map((inv) => inv._id),
      appointmentIds,
      totalPatientPaidInr,
      doctorSharePercentage,
      doctorShareInr,
      clinicShareInr,
      adjustmentsInr,
      netPayableInr,
      netPayablePaise,
      status: 'approved',
      approvedBy: req.user?._id,
      approvedAt: new Date(),
      notes,
    });

    // Mark invoices as batched
    await Invoice.updateMany(
      { _id: { $in: invoices.map((inv) => inv._id) } },
      {
        settlementStatus: 'batched',
        settlementId: settlement._id,
        doctorShareAmount: doctorShareInr,
        clinicShareAmount: clinicShareInr,
      }
    );

    await logAuditEvent(req, 'CREATE_DOCTOR_SETTLEMENT', 'DoctorSettlement', settlement._id.toString(), {
      settlementId,
      doctorId,
      netPayableInr,
      invoicesCount: invoices.length,
    });

    res.status(201).json({
      success: true,
      message: `Doctor settlement batch ${settlementId} created and approved for ₹${netPayableInr}.`,
      data: settlement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create doctor settlement', error: error.message });
  }
};

/**
 * POST /api/clinics/:id/settlements/:settlementId/pay
 * Mark doctor settlement as PAID (manual bank transfer / UTR recording)
 * Updates financial ledger with a debit entry
 */
export const markSettlementPaid = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { settlementId } = req.params;
    const { paymentReference, paymentMode = 'manual_bank_transfer', notes } = req.body;

    const settlementIdStr = String(req.params.settlementId);
    const settlement = await DoctorSettlement.findOne(
      settlementIdStr.startsWith('SET-') ? { settlementId: settlementIdStr } : { _id: settlementIdStr }
    ).populate('doctorId');

    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement not found' });
      return;
    }

    if (settlement.status === 'paid') {
      res.status(400).json({ success: false, message: 'Settlement is already marked as paid' });
      return;
    }

    settlement.status = 'paid';
    settlement.paymentMode = paymentMode;
    settlement.paymentReference = paymentReference || `UTR-${Date.now().toString().slice(-8)}`;
    settlement.paidAt = new Date();
    if (notes) settlement.notes = notes;
    await settlement.save();

    // Mark invoices as settled
    await Invoice.updateMany(
      { _id: { $in: settlement.invoiceIds } },
      { settlementStatus: 'settled' }
    );

    // Record immutable financial ledger entry (Debit from clinic funds)
    const ledgerEntryId = generateId('LEDG');
    await FinancialLedgerEntry.create({
      entryId: ledgerEntryId,
      clinicId: settlement.clinicId,
      type: 'doctor_settlement',
      direction: 'debit',
      amountPaise: settlement.netPayablePaise,
      amountInr: settlement.netPayableInr,
      status: 'settled',
      description: `Doctor consultation payout to Dr. ${(settlement.doctorId as any)?.name || 'Doctor'} (Settlement ${settlement.settlementId})`,
      referenceType: 'DoctorSettlement',
      referenceId: settlement.settlementId,
      settlementId: settlement._id,
      doctorId: settlement.doctorId,
      transactionRef: settlement.paymentReference,
      paymentMethod: paymentMode,
    });

    await logAuditEvent(req, 'SETTLE_DOCTOR_PAYMENT', 'DoctorSettlement', settlement._id.toString(), {
      settlementId: settlement.settlementId,
      netPayableInr: settlement.netPayableInr,
      paymentReference: settlement.paymentReference,
    });

    res.json({
      success: true,
      message: `Settlement marked paid. UTR/Ref: ${settlement.paymentReference} recorded in financial ledger.`,
      data: settlement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record settlement payment', error: error.message });
  }
};
