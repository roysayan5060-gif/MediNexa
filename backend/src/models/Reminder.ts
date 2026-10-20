import mongoose, { Document, Schema } from 'mongoose';

export type ReminderType = 'appointment' | 'follow-up' | 'medication' | 'report-review' | 'vaccination' | 'general';
export type ReminderStatus = 'pending' | 'sent' | 'acknowledged' | 'failed' | 'cancelled';

export interface IReminder extends Document {
  reminderId: string;
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  type: ReminderType;
  title: string;
  description: string;
  dueDate: Date;
  status: ReminderStatus;
  retryCount: number;
  lastAttemptAt?: Date;
  failureReason?: string;
  deliveryChannel: 'in-app' | 'email' | 'sms';
  relatedEntityId?: mongoose.Types.ObjectId;
  relatedEntityType?: 'Appointment' | 'Prescription' | 'ClinicalEncounter';
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    reminderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    type: {
      type: String,
      enum: ['appointment', 'follow-up', 'medication', 'report-review', 'vaccination', 'general'],
      default: 'general',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'acknowledged', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    deliveryChannel: {
      type: String,
      enum: ['in-app', 'email', 'sms'],
      default: 'in-app',
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId,
    },
    relatedEntityType: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index to query pending reminders due up to now
ReminderSchema.index({ status: 1, dueDate: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
