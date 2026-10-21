import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  event: string;
  orderId?: string;
  paymentId?: string;
  processedAt: Date;
  status: 'processed' | 'duplicate' | 'failed';
  payload?: any;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
      sparse: true,
    },
    paymentId: {
      type: String,
      index: true,
      sparse: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['processed', 'duplicate', 'failed'],
      default: 'processed',
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
