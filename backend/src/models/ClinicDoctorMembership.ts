import mongoose, { Document, Schema } from 'mongoose';
import { IWorkingHour } from './Doctor';

export interface IClinicDoctorMembership extends Document {
  clinicId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  consultationFee: number;
  doctorSharePercentage: number; // e.g. 70 for 70% doctor share
  appointmentDurationMinutes: number;
  workingHours: IWorkingHour[];
  breakTimes?: { startTime: string; endTime: string }[];
  holidays?: string[]; // array of 'YYYY-MM-DD'
  isActive: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkingHourSchema = new Schema<IWorkingHour>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDurationMinutes: { type: Number, default: 30 },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const BreakTimeSchema = new Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const ClinicDoctorMembershipSchema = new Schema<IClinicDoctorMembership>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    consultationFee: {
      type: Number,
      required: true,
      default: 500,
    },
    doctorSharePercentage: {
      type: Number,
      required: true,
      default: 70, // 70% doctor, 30% clinic
      min: 0,
      max: 100,
    },
    appointmentDurationMinutes: {
      type: Number,
      default: 30,
    },
    workingHours: {
      type: [WorkingHourSchema],
      default: [],
    },
    breakTimes: {
      type: [BreakTimeSchema],
      default: [],
    },
    holidays: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so a doctor has one active membership record per clinic
ClinicDoctorMembershipSchema.index({ clinicId: 1, doctorId: 1 }, { unique: true });

export const ClinicDoctorMembership = mongoose.model<IClinicDoctorMembership>(
  'ClinicDoctorMembership',
  ClinicDoctorMembershipSchema
);
