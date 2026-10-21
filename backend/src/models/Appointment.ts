import mongoose, { Document, Schema } from 'mongoose';

export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type AppointmentPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'waived';
export type AppointmentType = 'in-person' | 'teleconsultation' | 'follow-up';

export interface IAppointment extends Document {
  appointmentId: string;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  appointmentDate: Date; // e.g., 2026-10-21T00:00:00.000Z
  startTime: string;     // "10:00"
  endTime: string;       // "10:30"
  status: AppointmentStatus;
  paymentStatus: AppointmentPaymentStatus;
  type: AppointmentType;
  reason: string;
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  notes?: string;
  followUpForAppointmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    appointmentId: {
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
      required: true,
      index: true,
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'confirmed',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'waived'],
      default: 'pending',
      index: true,
    },
    type: {
      type: String,
      enum: ['in-person', 'teleconsultation', 'follow-up'],
      default: 'in-person',
    },
    reason: {
      type: String,
      default: 'General Consultation',
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
    followUpForAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient conflict checking and doctor schedules
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
AppointmentSchema.index({ patientId: 1, appointmentDate: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
