import mongoose, { Document, Schema } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IPatient extends Document {
  patientId: string; // Unique server generated ID e.g. PAT-2026-0001
  userId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  phone: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  emergencyContact: IEmergencyContact;
  allergies: string[];
  chronicConditions: string[];
  medicalHistory: string;
  status: 'active' | 'inactive';
  primaryDoctorId?: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  { _id: false }
);

const PatientSchema = new Schema<IPatient>(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    emergencyContact: {
      type: EmergencyContactSchema,
      default: () => ({ name: '', relationship: '', phone: '' }),
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    medicalHistory: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    primaryDoctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PatientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Text index for fast patient search by name, patientId, phone
PatientSchema.index({ firstName: 'text', lastName: 'text', patientId: 'text', phone: 'text' });

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
