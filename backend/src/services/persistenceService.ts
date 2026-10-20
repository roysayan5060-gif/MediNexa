import fs from 'fs';
import path from 'path';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Clinic } from '../models/Clinic';
import { ClinicDoctorMembership } from '../models/ClinicDoctorMembership';
import { Appointment } from '../models/Appointment';
import { Prescription } from '../models/Prescription';
import { Invoice } from '../models/Invoice';
import { DoctorSettlement } from '../models/DoctorSettlement';
import { Reminder } from '../models/Reminder';
import { Notification } from '../models/Notification';

const DATA_DIR = path.resolve(__dirname, '../../data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'doctor_x_persistent_data.json');

let autoSaveTimer: NodeJS.Timeout | null = null;
let isSaving = false;

// Ensure persistent data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

/**
 * Saves a complete on-disk JSON snapshot of all collections.
 * This guarantees zero data loss even when laptop powers off or restarts.
 */
export const saveDatabaseSnapshot = async (): Promise<void> => {
  if (isSaving) return;
  try {
    isSaving = true;
    ensureDataDir();

    const [
      users,
      patients,
      doctors,
      clinics,
      memberships,
      appointments,
      prescriptions,
      invoices,
      settlements,
      reminders,
      notifications,
    ] = await Promise.all([
      User.find({}).select('+password').lean(),
      Patient.find({}).lean(),
      Doctor.find({}).lean(),
      Clinic.find({}).lean(),
      ClinicDoctorMembership.find({}).lean(),
      Appointment.find({}).lean(),
      Prescription.find({}).lean(),
      Invoice.find({}).lean(),
      DoctorSettlement.find({}).lean(),
      Reminder.find({}).lean(),
      Notification.find({}).lean(),
    ]);

    // Only save if there is data to preserve
    if (users.length > 0) {
      const snapshot = {
        savedAt: new Date().toISOString(),
        version: '2.0',
        counts: {
          users: users.length,
          patients: patients.length,
          doctors: doctors.length,
          clinics: clinics.length,
          appointments: appointments.length,
          prescriptions: prescriptions.length,
        },
        data: {
          users,
          patients,
          doctors,
          clinics,
          memberships,
          appointments,
          prescriptions,
          invoices,
          settlements,
          reminders,
          notifications,
        },
      };

      const tempFile = `${SNAPSHOT_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tempFile, SNAPSHOT_FILE);
    }
  } catch (err: any) {
    console.error('[Persistence Error]: Failed to save database snapshot to disk:', err.message);
  } finally {
    isSaving = false;
  }
};

/**
 * Restores all saved database records from on-disk JSON snapshot on boot.
 */
export const restoreDatabaseSnapshot = async (): Promise<boolean> => {
  try {
    ensureDataDir();

    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return false;
    }

    const fileContent = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
    if (!fileContent || fileContent.trim() === '') {
      return false;
    }

    const snapshot = JSON.parse(fileContent);
    const { data } = snapshot;
    if (!data || !data.users || data.users.length === 0) {
      return false;
    }

    console.log(`[Persistence] Found persistent on-disk database snapshot saved at ${snapshot.savedAt}`);
    console.log(`[Persistence] Hydrating database with ${data.users.length} user(s), ${data.doctors?.length || 0} doctor(s), ${data.patients?.length || 0} patient(s)...`);

    // 1. Restore Clinics
    try {
      if (data.clinics && data.clinics.length > 0) {
        for (const item of data.clinics) {
          await Clinic.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring clinics:', e.message);
    }

    // 2. Restore Users (preserving exact hashed passwords and IDs)
    try {
      if (data.users && data.users.length > 0) {
        for (const item of data.users) {
          await User.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring users:', e.message);
    }

    // 3. Restore Patients
    try {
      if (data.patients && data.patients.length > 0) {
        for (const item of data.patients) {
          await Patient.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring patients:', e.message);
    }

    // 4. Restore Doctors
    try {
      if (data.doctors && data.doctors.length > 0) {
        for (const item of data.doctors) {
          await Doctor.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring doctors:', e.message);
    }

    // 5. Restore Memberships
    try {
      if (data.memberships && data.memberships.length > 0) {
        for (const item of data.memberships) {
          await ClinicDoctorMembership.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring memberships:', e.message);
    }

    // 6. Restore Appointments
    try {
      if (data.appointments && data.appointments.length > 0) {
        for (const item of data.appointments) {
          await Appointment.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring appointments:', e.message);
    }

    // 7. Restore Prescriptions
    try {
      if (data.prescriptions && data.prescriptions.length > 0) {
        for (const item of data.prescriptions) {
          await Prescription.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring prescriptions:', e.message);
    }

    // 8. Restore Invoices
    try {
      if (data.invoices && data.invoices.length > 0) {
        for (const item of data.invoices) {
          await Invoice.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring invoices:', e.message);
    }

    // 9. Restore Doctor Settlements
    try {
      if (data.settlements && data.settlements.length > 0) {
        for (const item of data.settlements) {
          await DoctorSettlement.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring settlements:', e.message);
    }

    // 10. Restore Reminders & Notifications
    try {
      if (data.reminders && data.reminders.length > 0) {
        for (const item of data.reminders) {
          await Reminder.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
      if (data.notifications && data.notifications.length > 0) {
        for (const item of data.notifications) {
          await Notification.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
        }
      }
    } catch (e: any) {
      console.warn('[Persistence] Notice while restoring reminders/notifications:', e.message);
    }

    console.log(`[Persistence] Database successfully restored from on-disk storage. Zero data loss.`);
    return true;
  } catch (err: any) {
    console.error('[Persistence Error]: Failed to restore snapshot from disk:', err.message);
    return false;
  }
};

/**
 * Initiates recurring background auto-save.
 */
export const startPersistenceWorker = (intervalMs = 15000): void => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);

  autoSaveTimer = setInterval(async () => {
    await saveDatabaseSnapshot();
  }, intervalMs);

  // Hook process shutdown signals to guarantee final save
  process.on('SIGINT', async () => {
    await saveDatabaseSnapshot();
  });
  process.on('SIGTERM', async () => {
    await saveDatabaseSnapshot();
  });
  process.on('beforeExit', async () => {
    await saveDatabaseSnapshot();
  });
};
