import mongoose, { Document, Schema } from 'mongoose';

export interface IBankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface IClinic extends Document {
  name: string;
  code: string;
  ownerName?: string;
  registrationNumber?: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  phone: string;
  email: string;
  isActive: boolean;
  consultationFeeDefault: number;
  defaultDoctorSharePercentage: number; // e.g. 70 means 70% to doctor, 30% to clinic
  availableBalancePaise: number; // stored in integer paise
  bankDetails?: IBankDetails;
  createdAt: Date;
  updatedAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
  },
  { _id: false }
);

const ClinicSchema = new Schema<IClinic>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
      default: '',
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    consultationFeeDefault: {
      type: Number,
      default: 500,
    },
    defaultDoctorSharePercentage: {
      type: Number,
      default: 70, // 70% to doctor, 30% retained by clinic
      min: 0,
      max: 100,
    },
    availableBalancePaise: {
      type: Number,
      default: 0,
    },
    bankDetails: {
      type: BankDetailsSchema,
      default: () => ({
        accountName: '',
        accountNumber: '',
        ifsc: '',
        bankName: '',
      }),
    },
  },
  {
    timestamps: true,
  }
);

export const Clinic = mongoose.model<IClinic>('Clinic', ClinicSchema);
