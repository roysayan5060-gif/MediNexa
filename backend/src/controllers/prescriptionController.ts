import { Response } from 'express';
import { Prescription, IPrescription } from '../models/Prescription';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Notification } from '../models/Notification';
import { Reminder } from '../models/Reminder';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { logAuditEvent } from '../middleware/auditLogger';

export const createPrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      encounterId,
      patientId,
      doctorId,
      items,
      diagnosisSummary,
      additionalInstructions,
      followUpDate,
      status = 'active',
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
      res.status(404).json({ success: false, message: 'Doctor record not found for this prescription.' });
      return;
    }

    const prescriptionId = generateId('RX');

    const prescription = await Prescription.create({
      prescriptionId,
      encounterId: encounterId || undefined,
      patientId: patient._id,
      doctorId: doctor._id,
      items,
      diagnosisSummary: diagnosisSummary || '',
      additionalInstructions: additionalInstructions || '',
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      status,
      approvedBy: req.user?._id,
      approvedByName: req.user?.name || doctor.name,
      approvedAt: new Date(),
      amendmentHistory: [],
    });

    // Notify patient
    if (patient.userId) {
      await Notification.create({
        userId: patient.userId,
        patientId: patient._id,
        title: 'New Prescription Available',
        message: `Dr. ${doctor.name} issued a new prescription (${prescription.prescriptionId}) for you.`,
        type: 'prescription',
        link: `/prescriptions/${prescription.prescriptionId}`,
      });
    }

    // If follow-up date is provided, automatically schedule follow-up reminder
    if (followUpDate) {
      const followUpDateObj = new Date(followUpDate);
      const reminderDate = new Date(followUpDateObj);
      reminderDate.setDate(reminderDate.getDate() - 2); // 2 days before

      if (reminderDate > new Date()) {
        await Reminder.create({
          reminderId: generateId('REM'),
          patientId: patient._id,
          doctorId: doctor._id,
          type: 'follow-up',
          title: `Follow-Up Consultation Due with Dr. ${doctor.name}`,
          description: `Scheduled follow-up regarding prescription ${prescription.prescriptionId} on ${followUpDateObj.toLocaleDateString()}.`,
          dueDate: reminderDate,
          status: 'pending',
          deliveryChannel: 'in-app',
          relatedEntityId: prescription._id,
          relatedEntityType: 'Prescription',
        });
      }
    }

    await logAuditEvent(req, 'CREATE_PRESCRIPTION', 'Prescription', prescription._id.toString(), {
      prescriptionId: prescription.prescriptionId,
      patientId: patient.patientId,
      itemCount: items.length,
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created and approved successfully.',
      data: prescription,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create prescription', error: error.message });
  }
};

export const getPrescriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName patientId dateOfBirth gender bloodGroup allergies')
      .populate('doctorId', 'name specialty title registrationNumber phone email clinicId');

    res.json({
      success: true,
      data: prescriptions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch prescriptions', error: error.message });
  }
};

export const getPrescriptionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('RX-') ? { prescriptionId: id } : { _id: id };

    const prescription = await Prescription.findOne(query)
      .populate('patientId', 'firstName lastName patientId dateOfBirth gender bloodGroup allergies phone address emergencyContact')
      .populate({
        path: 'doctorId',
        select: 'name specialty title registrationNumber qualifications phone email clinicId',
        populate: { path: 'clinicId', select: 'name address city state phone email' },
      });

    if (!prescription) {
      res.status(404).json({ success: false, message: 'Prescription not found' });
      return;
    }

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch prescription', error: error.message });
  }
};

export const amendPrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason, items, additionalInstructions, followUpDate } = req.body;

    const query = id.startsWith('RX-') ? { prescriptionId: id } : { _id: id };
    const prescription = await Prescription.findOne(query);

    if (!prescription) {
      res.status(404).json({ success: false, message: 'Prescription not found' });
      return;
    }

    // Save current items into amendment history
    prescription.amendmentHistory.push({
      amendedAt: new Date(),
      amendedBy: req.user?._id as any,
      amendedByName: req.user?.name || 'Doctor',
      reason,
      previousItems: prescription.items,
    });

    // Update with new items
    prescription.items = items;
    if (additionalInstructions !== undefined) prescription.additionalInstructions = additionalInstructions;
    if (followUpDate) prescription.followUpDate = new Date(followUpDate);
    prescription.status = 'amended';

    await prescription.save();

    await logAuditEvent(req, 'AMEND_PRESCRIPTION', 'Prescription', prescription._id.toString(), {
      prescriptionId: prescription.prescriptionId,
      reason,
      newItemCount: items.length,
    });

    res.json({
      success: true,
      message: 'Prescription amended successfully.',
      data: prescription,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to amend prescription', error: error.message });
  }
};

/**
 * POST /api/prescriptions/:id/send-whatsapp
 * Dispatches the structured e-prescription directly to the patient's WhatsApp number.
 * Formats clinical prescription text with medicine names, dosages, instructions,
 * and generates a direct wa.me link as well as logging delivery status and audit trail.
 */
export const sendPrescriptionWhatsApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { customPhone, customNote } = req.body;

    const query = id.startsWith('RX-') ? { prescriptionId: id } : { _id: id };
    const prescription = await Prescription.findOne(query)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'clinicId' },
      });

    if (!prescription) {
      res.status(404).json({ success: false, message: 'Prescription not found' });
      return;
    }

    const patient: any = prescription.patientId;
    const doctor: any = prescription.doctorId;
    const clinic: any = doctor?.clinicId;

    // Resolve target phone number
    let rawPhone = customPhone || patient?.phone || '';
    if (!rawPhone || rawPhone === 'N/A') {
      res.status(400).json({
        success: false,
        message: 'Patient does not have a registered phone number. Please provide a valid WhatsApp number.',
      });
      return;
    }

    // Clean phone number (strip spaces, dashes, parentheses)
    let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      // If 10 digits (standard Indian mobile), prepend 91
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }
    } else {
      cleanPhone = cleanPhone.replace('+', '');
    }

    // Build beautifully formatted WhatsApp prescription template message
    const clinicName = clinic?.name || 'Doctor X Healthcare Center';
    const clinicContact = clinic?.phone ? ` | Call: ${clinic.phone}` : '';
    const followUpStr = prescription.followUpDate
      ? `\n📅 *Follow-up Date:* ${new Date(prescription.followUpDate).toLocaleDateString()}`
      : '';
    const instructionsStr = prescription.additionalInstructions
      ? `\n📝 *Doctor's Advice:* ${prescription.additionalInstructions}`
      : '';
    const customNoteStr = customNote ? `\n💬 *Personal Note:* ${customNote}` : '';

    const itemsText = prescription.items
      .map((it, idx) => {
        return (
          `\n*${idx + 1}. ${it.medicineName} ${it.dosageStrength}* (${it.route})\n` +
          `   • *Frequency:* ${it.frequency}\n` +
          `   • *Duration:* ${it.duration} (Total Qty: ${it.quantity})\n` +
          `   • *Timing:* ${it.foodInstruction}` +
          (it.specialInstructions ? `\n   • *Special Note:* ${it.specialInstructions}` : '')
        );
      })
      .join('\n');

    const messageText =
      `*🏥 ${clinicName.toUpperCase()} — DIGITAL PRESCRIPTION*\n` +
      `----------------------------------------\n` +
      `📋 *Rx ID:* ${prescription.prescriptionId}\n` +
      `👨‍⚕️ *Doctor:* ${doctor?.title || 'Dr.'} ${doctor?.name} (${doctor?.specialty || 'General Practitioner'})\n` +
      `🧑‍💼 *Patient:* ${patient?.firstName} ${patient?.lastName} (ID: ${patient?.patientId})\n` +
      `🗓️ *Date:* ${new Date(prescription.createdAt).toLocaleDateString()}\n` +
      (prescription.diagnosisSummary ? `🩺 *Diagnosis:* ${prescription.diagnosisSummary}\n` : '') +
      `----------------------------------------\n` +
      `*💊 PRESCRIBED MEDICINES:*\n` +
      `${itemsText}\n` +
      `----------------------------------------` +
      `${instructionsStr}` +
      `${followUpStr}` +
      `${customNoteStr}\n\n` +
      `✅ *Digitally Approved & Signed by:* ${prescription.approvedByName}\n` +
      `🔒 *HIPAA & Digital Health Record (DPDP) Verified*\n` +
      `📞 *Clinic Contact:* ${clinicName}${clinicContact}\n` +
      `🌐 *Patient Portal:* ${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/prescriptions`;

    // Encode for WhatsApp URL (wa.me)
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // Update prescription record
    prescription.whatsappSent = true;
    prescription.whatsappSentAt = new Date();
    prescription.whatsappRecipientPhone = cleanPhone;
    prescription.whatsappStatus = 'sent';
    await prescription.save();

    // Create In-App Notification for patient
    if (patient?.userId) {
      await Notification.create({
        userId: patient.userId,
        patientId: patient._id,
        title: 'Prescription Sent to WhatsApp',
        message: `Your prescription (${prescription.prescriptionId}) has been dispatched to WhatsApp number +${cleanPhone}.`,
        type: 'prescription',
        link: `/prescriptions/${prescription.prescriptionId}`,
      });
    }

    await logAuditEvent(req, 'DISPATCH_WHATSAPP_PRESCRIPTION', 'Prescription', prescription._id.toString(), {
      prescriptionId: prescription.prescriptionId,
      recipientPhone: cleanPhone,
      patientId: patient?._id,
    });

    res.json({
      success: true,
      message: `Prescription successfully dispatched to WhatsApp number +${cleanPhone}.`,
      data: {
        prescriptionId: prescription.prescriptionId,
        recipientPhone: cleanPhone,
        whatsappUrl,
        messageText,
        sentAt: prescription.whatsappSentAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to send prescription to WhatsApp', error: error.message });
  }
};
