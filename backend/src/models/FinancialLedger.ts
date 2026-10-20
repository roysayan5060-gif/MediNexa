import mongoose, { Document, Schema } from 'mongoose';

export type LedgerEntryType =
  | 'patient_payment'
  | 'gateway_fee'
  | 'refund'
  | 'doctor_settlement'
  | 'clinic_bank_settlement'
  | 'adjustment';

export type LedgerDirection = 'credit' | 'debit';
export type LedgerEntryStatus = 'pending' | 'cleared' | 'settled' | 'reversed' | 'failed';

export interface IFinancialLedgerEntry extends Document {
  entryId: string; // e.g. LEDG-XXXXXX
  clinicId: mongoose.Types.ObjectId;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amountPaise: number; // Integer paise (e.g. 50000 paise = 500.00 INR)
  amountInr: number;   // Decimal rupees for display and fast analytics
  currency: string;    // 'INR'
  status: LedgerEntryStatus;
  description: string;
  referenceType?: 'Invoice' | 'DoctorSettlement' | 'Refund' | 'BankTransfer' | 'Manual';
  referenceId?: string; // e.g. INV-1002, SET-101
  invoiceId?: mongoose.Types.ObjectId;
  settlementId?: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  paymentMethod?: string;
  transactionRef?: string;
  gatewayFeePaise?: number;
  netAmountPaise?: number;
  reversalOfEntryId?: mongoose.Types.ObjectId;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialLedgerEntrySchema = new Schema<IFinancialLedgerEntry>(
  {
    entryId: {
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
    type: {
      type: String,
      enum: [
        'patient_payment',
        'gateway_fee',
        'refund',
        'doctor_settlement',
        'clinic_bank_settlement',
        'adjustment',
      ],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    amountInr: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'cleared', 'settled', 'reversed', 'failed'],
      default: 'cleared',
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ['Invoice', 'DoctorSettlement', 'Refund', 'BankTransfer', 'Manual'],
    },
    referenceId: {
      type: String,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: 'DoctorSettlement',
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    paymentMethod: {
      type: String,
      default: 'upi_test',
    },
    transactionRef: {
      type: String,
    },
    gatewayFeePaise: {
      type: Number,
      default: 0,
    },
    netAmountPaise: {
      type: Number,
      default: 0,
    },
    reversalOfEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'FinancialLedgerEntry',
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
FinancialLedgerEntrySchema.index({ clinicId: 1, createdAt: -1 });
FinancialLedgerEntrySchema.index({ clinicId: 1, type: 1 });
FinancialLedgerEntrySchema.index({ doctorId: 1, createdAt: -1 });

export const FinancialLedgerEntry = mongoose.model<IFinancialLedgerEntry>(
  'FinancialLedgerEntry',
  FinancialLedgerEntrySchema
);
