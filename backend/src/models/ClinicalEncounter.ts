import mongoose, { Document, Schema } from 'mongoose';

export interface IVitalSigns {
  bloodPressure?: string; // e.g. "120/80"
  heartRate?: number;     // bpm
  temperature?: number;   // °F or °C
  weightKg?: number;
  heightCm?: number;
  respiratoryRate?: number;
  spo2?: number;          // %
}

export interface IClinicalEncounter extends Document {
  encounterId: string;
  appointmentId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  encounterDate: Date;
  vitals: IVitalSigns;
  chiefComplaints: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  diagnosis: string;
  clinicalNotes: string;
  followUpPlan: string;
  status: 'in-progress' | 'finalized';
  createdAt: Date;
  updatedAt: Date;
}

const VitalSignsSchema = new Schema<IVitalSigns>(
  {
    bloodPressure: { type: String, default: '' },
    heartRate: { type: Number },
    temperature: { type: Number },
    weightKg: { type: Number },
    heightCm: { type: Number },
    respiratoryRate: { type: Number },
    spo2: { type: Number },
  },
  { _id: false }
);

const ClinicalEncounterSchema = new Schema<IClinicalEncounter>(
  {
    encounterId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
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
    encounterDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    vitals: {
      type: VitalSignsSchema,
      default: () => ({}),
    },
    chiefComplaints: {
      type: String,
      required: true,
    },
    historyOfPresentIllness: {
      type: String,
      default: '',
    },
    physicalExamination: {
      type: String,
      default: '',
    },
    diagnosis: {
      type: String,
      required: true,
    },
    clinicalNotes: {
      type: String,
      default: '',
    },
    followUpPlan: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['in-progress', 'finalized'],
      default: 'finalized',
    },
  },
  {
    timestamps: true,
  }
);

export const ClinicalEncounter = mongoose.model<IClinicalEncounter>('ClinicalEncounter', ClinicalEncounterSchema);
