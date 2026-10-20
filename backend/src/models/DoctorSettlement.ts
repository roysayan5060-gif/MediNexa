import mongoose, { Document, Schema } from 'mongoose';

export type SettlementStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type SettlementMode = 'manual_bank_transfer' | 'upi' | 'provider_payout' | 'cash';

export interface IDoctorSettlement extends Document {
  settlementId: string;
  clinicId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  invoiceIds: mongoose.Types.ObjectId[];
  appointmentIds: mongoose.Types.ObjectId[];
  periodStart?: Date;
  periodEnd?: Date;
  totalPatientPaidInr: number;
  doctorSharePercentage: number;
  doctorShareInr: number;
  clinicShareInr: number;
  adjustmentsInr: number;
  netPayableInr: number;
  netPayablePaise: number;
  status: SettlementStatus;
  paymentMode: SettlementMode;
  paymentReference?: string; // UTR or Bank transaction number
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSettlementSchema = new Schema<IDoctorSettlement>(
  {
    settlementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    invoiceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
      },
    ],
    appointmentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Appointment',
      },
    ],
    periodStart: {
      type: Date,
    },
    periodEnd: {
      type: Date,
    },
    totalPatientPaidInr: {
      type: Number,
      required: true,
      min: 0,
    },
    doctorSharePercentage: {
      type: Number,
      required: true,
      default: 70,
    },
    doctorShareInr: {
      type: Number,
      required: true,
      min: 0,
    },
    clinicShareInr: {
      type: Number,
      required: true,
      min: 0,
    },
    adjustmentsInr: {
      type: Number,
      default: 0,
    },
    netPayableInr: {
      type: Number,
      required: true,
      min: 0,
    },
    netPayablePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'processing', 'paid', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ['manual_bank_transfer', 'upi', 'provider_payout', 'cash'],
      default: 'manual_bank_transfer',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
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

DoctorSettlementSchema.index({ clinicId: 1, doctorId: 1, status: 1 });

export const DoctorSettlement = mongoose.model<IDoctorSettlement>(
  'DoctorSettlement',
  DoctorSettlementSchema
);
