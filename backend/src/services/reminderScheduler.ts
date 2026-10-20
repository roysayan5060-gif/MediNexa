import { Reminder } from '../models/Reminder';
import { Notification } from '../models/Notification';
import { Patient } from '../models/Patient';

let schedulerInterval: NodeJS.Timeout | null = null;

export const processDueReminders = async (): Promise<number> => {
  try {
    const now = new Date();
    // Find pending reminders due up to now with less than 3 retries
    const dueReminders = await Reminder.find({
      status: 'pending',
      dueDate: { $lte: now },
      retryCount: { $lt: 3 },
    }).limit(50);

    if (dueReminders.length === 0) {
      return 0;
    }

    console.log(`[Reminder Worker] Found ${dueReminders.length} due reminder(s) to process.`);
    let processedCount = 0;

    for (const reminder of dueReminders) {
      try {
        const patient = await Patient.findById(reminder.patientId);

        if (patient && patient.userId) {
          // Check for duplicate in-app notification in last 1 hour
          const existingNotification = await Notification.findOne({
            userId: patient.userId,
            'metadata.reminderId': reminder.reminderId,
          });

          if (!existingNotification) {
            await Notification.create({
              userId: patient.userId,
              patientId: patient._id,
              title: reminder.title,
              message: reminder.description || reminder.title,
              type: 'reminder',
              link: '/portal/reminders',
              metadata: {
                reminderId: reminder.reminderId,
                type: reminder.type,
              },
            });
          }
        }

        // Mark reminder as successfully sent
        reminder.status = 'sent';
        reminder.lastAttemptAt = new Date();
        await reminder.save();
        processedCount++;
      } catch (err: any) {
        console.error(`[Reminder Worker] Failed to process reminder ${reminder.reminderId}:`, err.message);
        reminder.retryCount = (reminder.retryCount || 0) + 1;
        reminder.lastAttemptAt = new Date();
        reminder.failureReason = err.message;
        if (reminder.retryCount >= 3) {
          reminder.status = 'failed';
        }
        await reminder.save();
      }
    }

    return processedCount;
  } catch (error: any) {
    console.error('[Reminder Worker Error]:', error.message);
    return 0;
  }
};

export const startReminderScheduler = (intervalMs: number = 60000): void => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  console.log(`[Reminder Worker] Background scheduler initiated (scanning every ${intervalMs / 1000}s)...`);
  // Run once immediately
  processDueReminders().catch((e) => console.error(e));
  // Then schedule recurring
  schedulerInterval = setInterval(() => {
    processDueReminders().catch((e) => console.error(e));
  }, intervalMs);
};

export const stopReminderScheduler = (): void => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Reminder Worker] Background scheduler stopped.');
  }
};
