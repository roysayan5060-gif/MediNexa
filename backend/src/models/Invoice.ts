import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';
export type PaymentMethod =
  | 'test_simulation'
  | 'cash'
  | 'card_test'
  | 'upi_test'
  | 'netbanking_test'
  | 'pay_at_clinic'
  | 'insurance_claim';

export interface IInvoice extends Document {
  invoiceNumber: string;
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  amountPaise: number;
  doctorShareAmount: number;
  clinicShareAmount: number;
  gatewayCharges: number;
  refundAmount: number;
  refundStatus: 'none' | 'pending' | 'processing' | 'refunded' | 'failed';
  refundReason?: string;
  refundRef?: string;
  refundDate?: Date;
  settlementStatus: 'unsettled' | 'batched' | 'settled';
  settlementId?: mongoose.Types.ObjectId;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
  transactionRef?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
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
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: [(v: IInvoiceItem[]) => v.length > 0, 'At least one invoice line item required'],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    amountPaise: {
      type: Number,
      default: function (this: any) {
        return Math.round(((this && this.totalAmount) || 0) * 100);
      },
    },
    doctorShareAmount: {
      type: Number,
      default: 0,
    },
    clinicShareAmount: {
      type: Number,
      default: 0,
    },
    gatewayCharges: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'processing', 'refunded', 'failed'],
      default: 'none',
      index: true,
    },
    refundReason: {
      type: String,
      default: '',
    },
    refundRef: {
      type: String,
      default: '',
    },
    refundDate: {
      type: Date,
    },
    settlementStatus: {
      type: String,
      enum: ['unsettled', 'batched', 'settled'],
      default: 'unsettled',
      index: true,
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: 'DoctorSettlement',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        'test_simulation',
        'cash',
        'card_test',
        'upi_test',
        'netbanking_test',
        'pay_at_clinic',
        'insurance_claim',
      ],
      default: 'test_simulation',
    },
    paymentDate: {
      type: Date,
    },
    transactionRef: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: 'Demonstration / Sandbox billing record. No real credit card or sensitive payment information processed.',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InvoiceSchema.index({ clinicId: 1, status: 1 });
InvoiceSchema.index({ doctorId: 1, settlementStatus: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
