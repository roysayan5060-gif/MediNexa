import mongoose, { Document, Schema } from 'mongoose';

export type RouteType = 'Oral' | 'Topical' | 'Intravenous' | 'Intramuscular' | 'Inhalation' | 'Ophthalmic' | 'Sublingual' | 'Other';
export type FrequencyType =
  | 'Once Daily (OD)'
  | 'Twice Daily (BD)'
  | 'Three Times Daily (TDS)'
  | 'Four Times Daily (QID)'
  | 'As Needed (PRN)'
  | 'At Bedtime (HS)'
  | 'Every Other Day';

export type FoodInstructionType =
  | 'Before Food'
  | 'After Food'
  | 'With Food'
  | 'Empty Stomach'
  | 'No Specific Timing';

export interface IPrescriptionItem {
  medicineName: string;
  dosageStrength: string; // e.g. "500 mg", "10 ml"
  route: RouteType;
  frequency: FrequencyType;
  duration: string;       // e.g. "5 Days", "2 Weeks", "1 Month"
  quantity: number;
  foodInstruction: FoodInstructionType;
  specialInstructions?: string;
}

export interface IAmendment {
  amendedAt: Date;
  amendedBy: mongoose.Types.ObjectId;
  amendedByName: string;
  reason: string;
  previousItems: IPrescriptionItem[];
}

export interface IPrescription extends Document {
  prescriptionId: string;
  encounterId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  items: IPrescriptionItem[];
  diagnosisSummary?: string;
  additionalInstructions?: string;
  followUpDate?: Date;
  status: 'draft' | 'active' | 'completed' | 'amended' | 'cancelled';
  approvedBy: mongoose.Types.ObjectId;
  approvedByName: string;
  approvedAt: Date;
  amendmentHistory: IAmendment[];
  whatsappSent?: boolean;
  whatsappSentAt?: Date;
  whatsappRecipientPhone?: string;
  whatsappStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionItemSchema = new Schema<IPrescriptionItem>(
  {
    medicineName: { type: String, required: true, trim: true },
    dosageStrength: { type: String, required: true, trim: true },
    route: {
      type: String,
      enum: ['Oral', 'Topical', 'Intravenous', 'Intramuscular', 'Inhalation', 'Ophthalmic', 'Sublingual', 'Other'],
      default: 'Oral',
    },
    frequency: {
      type: String,
      enum: [
        'Once Daily (OD)',
        'Twice Daily (BD)',
        'Three Times Daily (TDS)',
        'Four Times Daily (QID)',
        'As Needed (PRN)',
        'At Bedtime (HS)',
        'Every Other Day',
      ],
      required: true,
    },
    duration: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    foodInstruction: {
      type: String,
      enum: ['Before Food', 'After Food', 'With Food', 'Empty Stomach', 'No Specific Timing'],
      default: 'After Food',
    },
    specialInstructions: { type: String, default: '' },
  },
  { _id: false }
);

const AmendmentSchema = new Schema<IAmendment>(
  {
    amendedAt: { type: Date, default: Date.now },
    amendedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amendedByName: { type: String, required: true },
    reason: { type: String, required: true },
    previousItems: [PrescriptionItemSchema],
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    encounterId: {
      type: Schema.Types.ObjectId,
      ref: 'ClinicalEncounter',
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
    items: {
      type: [PrescriptionItemSchema],
      validate: [(val: IPrescriptionItem[]) => val.length > 0, 'Prescription must contain at least one item.'],
    },
    diagnosisSummary: {
      type: String,
      default: '',
    },
    additionalInstructions: {
      type: String,
      default: '',
    },
    followUpDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'amended', 'cancelled'],
      default: 'active',
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedByName: {
      type: String,
      required: true,
    },
    approvedAt: {
      type: Date,
      default: Date.now,
    },
    amendmentHistory: {
      type: [AmendmentSchema],
      default: [],
    },
    whatsappSent: {
      type: Boolean,
      default: false,
    },
    whatsappSentAt: {
      type: Date,
    },
    whatsappRecipientPhone: {
      type: String,
      default: '',
    },
    whatsappStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
