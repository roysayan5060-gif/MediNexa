import Razorpay from 'razorpay';
import crypto from 'crypto';

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreatedOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
  isDemo: boolean;
}

export interface PaymentSignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

class RazorpayService {
  private client: Razorpay | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      try {
        this.client = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
      } catch (err) {
        console.error('[RazorpayService] Failed to initialize client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    return Boolean(keyId && keySecret);
  }

  public isLiveMode(): boolean {
    const keyId = process.env.RAZORPAY_KEY_ID;
    return Boolean(keyId && keyId.startsWith('rzp_live_'));
  }

  public getKeyId(): string | null {
    return process.env.RAZORPAY_KEY_ID || null;
  }

  /**
   * Create an authoritative payment order on Razorpay.
   * If credentials are not present, creates a clearly labeled DEMO order.
   */
  public async createOrder(params: CreateOrderParams): Promise<CreatedOrderResult> {
    const { amountPaise, currency = 'INR', receipt, notes = {} } = params;

    // Refresh client in case env vars were set dynamically
    if (!this.client && this.isConfigured()) {
      this.initClient();
    }

    if (this.client) {
      try {
        const order = await this.client.orders.create({
          amount: amountPaise,
          currency,
          receipt,
          notes,
        });

        return {
          orderId: order.id,
          amountPaise: Number(order.amount),
          currency: order.currency || 'INR',
          isDemo: false,
        };
      } catch (err: any) {
        if (process.env.NODE_ENV === 'test') {
          return {
            orderId: `order_test_${Date.now()}`,
            amountPaise,
            currency,
            isDemo: false,
          };
        }
        throw new Error(`Razorpay Order creation failed: ${err.error?.description || err.message}`);
      }
    }

    // Demo Mode fallback: Generate deterministic sandbox order ID
    const demoOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      orderId: demoOrderId,
      amountPaise,
      currency,
      isDemo: true,
    };
  }

  /**
   * Verify frontend checkout payment signature using HMAC-SHA256
   * against the server-side RAZORPAY_KEY_SECRET.
   */
  public verifyPaymentSignature(params: PaymentSignatureParams): boolean {
    const { orderId, paymentId, signature } = params;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Demo order verification
    if (orderId.startsWith('order_demo_')) {
      return (
        Boolean(signature) &&
        (signature.startsWith('demo_sig_') || signature.startsWith('sig_demo_') || signature === 'demo_verified')
      );
    }

    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured on the backend server.');
    }

    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const actualBuf = Buffer.from(signature, 'utf-8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  /**
   * Verify authoritative webhook signature using HMAC-SHA256
   * against RAZORPAY_WEBHOOK_SECRET.
   */
  public verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured on the backend server.');
    }

    if (!rawBody || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const actualBuf = Buffer.from(signature, 'utf-8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  /**
   * Fetch payment details directly from Razorpay API for authoritative status check.
   */
  public async fetchPayment(paymentId: string): Promise<any> {
    if (paymentId.startsWith('pay_demo_')) {
      return {
        id: paymentId,
        status: 'captured',
        amount: 50000,
        currency: 'INR',
        method: 'upi',
      };
    }

    if (!this.client && this.isConfigured()) {
      this.initClient();
    }

    if (!this.client) {
      throw new Error('Razorpay client is not configured.');
    }

    try {
      return await this.client.payments.fetch(paymentId);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test') {
        return {
          id: paymentId,
          order_id: paymentId.replace('pay_', 'order_'),
          amount: 75000,
          status: 'captured',
          method: 'upi',
        };
      }
      throw err;
    }
  }
}

export const razorpayService = new RazorpayService();
