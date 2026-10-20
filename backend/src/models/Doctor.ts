import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkingHour {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  slotDurationMinutes: number; // e.g. 30
  isAvailable: boolean;
}

export interface IDoctor extends Document {
  doctorId: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  title: string;
  specialty: string;
  qualifications: string[];
  registrationNumber: string;
  experienceYears: number;
  consultationFee: number;
  bio: string;
  phone: string;
  email: string;
  clinicId?: mongoose.Types.ObjectId;
  workingHours: IWorkingHour[];
  isVerified: boolean;
  rating: number;
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

const DoctorSchema = new Schema<IDoctor>(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: 'Dr.',
    },
    specialty: {
      type: String,
      required: true,
      index: true,
    },
    qualifications: {
      type: [String],
      default: ['MBBS'],
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
    },
    consultationFee: {
      type: Number,
      required: true,
      default: 500,
    },
    bio: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
    workingHours: {
      type: [WorkingHourSchema],
      default: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true },
        { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, isAvailable: true },
      ],
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema);
