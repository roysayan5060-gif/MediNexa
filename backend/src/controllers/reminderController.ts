import { Response } from 'express';
import { Reminder } from '../models/Reminder';
import { Patient } from '../models/Patient';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateId } from '../services/idGenerator';
import { processDueReminders } from '../services/reminderScheduler';

export const getReminders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId, status } = req.query;
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

    if (status && status !== 'all') {
      query.status = status;
    }

    const reminders = await Reminder.find(query)
      .sort({ dueDate: 1 })
      .populate('patientId', 'firstName lastName patientId phone')
      .populate('doctorId', 'name specialty');

    res.json({
      success: true,
      data: reminders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch reminders', error: error.message });
  }
};

export const createReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId, type, title, description, dueDate, deliveryChannel } = req.body;

    const patient = await Patient.findOne(
      patientId.startsWith('PAT-') ? { patientId } : { _id: patientId }
    );
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found' });
      return;
    }

    const reminderId = generateId('REM');

    const reminder = await Reminder.create({
      reminderId,
      patientId: patient._id,
      doctorId: doctorId || req.user?.doctorId,
      type,
      title,
      description,
      dueDate: new Date(dueDate),
      deliveryChannel: deliveryChannel || 'in-app',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Reminder scheduled successfully.',
      data: reminder,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create reminder', error: error.message });
  }
};

export const acknowledgeReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const query = id.startsWith('REM-') ? { reminderId: id } : { _id: id };

    const reminder = await Reminder.findOneAndUpdate(query, { status: 'acknowledged' }, { new: true });
    if (!reminder) {
      res.status(404).json({ success: false, message: 'Reminder not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Reminder acknowledged.',
      data: reminder,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update reminder', error: error.message });
  }
};

export const triggerWorkerRun = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const processed = await processDueReminders();
    res.json({
      success: true,
      message: `Processed ${processed} pending reminders.`,
      processedCount: processed,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Worker run failed', error: error.message });
  }
};
