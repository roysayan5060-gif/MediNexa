import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Invoice } from '../../types';
import {
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Printer,
  AlertCircle,
  Clock,
  Sparkles,
  Wallet,
  Lock,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export const MyPayments: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking' | 'wallet'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Form inputs
  const [cardNumber, setCardNumber] = useState('4532 8812 3920 1928');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Eleanor Vance');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('883');
  const [upiId, setUpiId] = useState('eleanor@okhdfcbank');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Receipt Modal
  const [viewingReceipt, setViewingReceipt] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/invoices');
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPending = totalBilled - totalPaid;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setPaymentError(null);
    setIsProcessing(true);

    try {
      const methodMapping = {
        card: 'card_test',
        upi: 'upi_test',
        netbanking: 'test_simulation',
        wallet: 'test_simulation',
      };

      const res = await api.post(`/invoices/${selectedInvoice.invoiceNumber}/pay`, {
        paymentMethod: methodMapping[paymentMethod],
      });

      if (res.data.success) {
        setPaymentSuccess(res.data.data);
        fetchInvoices();
      }
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Payment simulation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Retrieving your health invoices and billing statement..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure Healthcare Billing
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Bills & Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent consultation invoices, secure digital payment options, and receipts
          </p>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoiced</span>
            <p className="text-2xl font-black text-slate-900 mt-1">₹{totalBilled}</p>
            <span className="text-[11px] text-slate-500 font-medium">All Lifetime Visits</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Settled</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">₹{totalPaid}</p>
            <span className="text-[11px] text-emerald-600 font-bold">Paid & Cleared</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-amber-100/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Amount</span>
            <p className="text-2xl font-black text-amber-600 mt-1">₹{totalPending}</p>
            <span className="text-[11px] text-amber-700 font-bold">
              {totalPending > 0 ? 'Ready for Payment' : 'No Outstanding Balance'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Your Healthcare Invoices & Statements</h3>

        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Invoices Issued"
            description="You do not have any pending or past consultation bills. Invoices generated after appointments will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Doctor / Clinic</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-mono font-bold text-teal-800">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">
                        Dr. {inv.doctorId?.name || 'Clinic Service'}
                      </span>
                      <span className="text-[11px] text-teal-700 font-semibold">{inv.clinicId?.name || 'Apex Multispecialty'}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {inv.items?.map((it) => it.description).join(', ') || 'Consultation fee'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-black text-slate-900 font-mono">₹{inv.totalAmount}</span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'refunded' ? 'danger' : 'warning'}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {inv.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentSuccess(null);
                            setPaymentError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-600/20 transition transform hover:-translate-y-0.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay Now
                        </button>
                      ) : (
                        <button
                          onClick={() => setViewingReceipt(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition"
                        >
                          <Printer className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Payment Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title="Complete Consultation Payment"
          subtitle={`Invoice: ${selectedInvoice.invoiceNumber} • Recipient: ${selectedInvoice.clinicId?.name || 'Clinic'} • Amount Due: ₹${selectedInvoice.totalAmount}`}
          maxWidth="lg"
        >
          {paymentSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Successful!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transaction Reference: <strong className="font-mono text-teal-800">{paymentSuccess.transactionRef}</strong>
                </p>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Amount Paid to Clinic: ₹{paymentSuccess.totalAmount} (Simulated Sandbox)
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-3">
                <button
                  onClick={() => {
                    setViewingReceipt(paymentSuccess);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 hover:bg-teal-100 transition"
                >
                  <Printer className="w-3.5 h-3.5 inline mr-1" /> View Official Receipt
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-teal-600 hover:bg-teal-700 shadow-md transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {paymentError}
                </div>
              )}

              {/* Payment Methods Tabs */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'card'
                        ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-2.5 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'upi'
                        ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`p-2.5 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'netbanking'
                        ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Net Banking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-2.5 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'wallet'
                        ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Wallet</span>
                  </button>
                </div>
              </div>

              {/* Form Option 1: Credit / Debit Card */}
              {paymentMethod === 'card' && (
                <form onSubmit={handleProcessPayment} className="space-y-3.5">
                  {/* Visual Card Representation */}
                  <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 text-white shadow-lg space-y-3 border border-slate-700">
                    <div className="flex justify-between items-center text-teal-300">
                      <span className="font-mono text-[10px] tracking-widest uppercase">Doctor X Health Pay</span>
                      <CreditCard className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="font-mono text-base tracking-widest font-bold text-center py-1">
                      {cardNumber}
                    </div>
                    <div className="flex justify-between items-end text-[10px] uppercase text-slate-300">
                      <div>
                        <span className="text-[8px] text-slate-400 block">Cardholder</span>
                        <span className="font-bold text-white">{cardHolder}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block">Expires</span>
                        <span className="font-bold text-white">{cardExpiry}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Card Number</label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 •••• •••• ••••"
                        className="w-full rounded-xl border border-slate-200 p-2 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full rounded-xl border border-slate-200 p-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Security Code (CVV)</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          className="w-full rounded-xl border border-slate-200 p-2 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black text-sm shadow-lg shadow-teal-600/25 transition disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {isProcessing ? 'Verifying 256-bit Token...' : `Authorize $${selectedInvoice.totalAmount}`}
                  </button>
                </form>
              )}

              {/* Form Option 2: UPI / QR Code */}
              {paymentMethod === 'upi' && (
                <form onSubmit={handleProcessPayment} className="space-y-4 text-center">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 inline-block mx-auto shadow-xs">
                    {/* Simulated SVG QR Code */}
                    <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-300 mx-auto flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-slate-900" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold block mt-2">
                      Scan with Google Pay, PhonePe, Paytm or BHIM
                    </span>
                  </div>

                  <div className="text-left">
                    <label className="block font-bold text-slate-700 mb-1">Or Enter Virtual Payment Address (UPI ID)</label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@bank"
                      className="w-full rounded-xl border border-slate-200 p-2"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-black text-sm shadow-md transition disabled:opacity-50"
                  >
                    {isProcessing ? 'Waiting for UPI App Approval...' : `Verify & Pay $${selectedInvoice.totalAmount}`}
                  </button>
                </form>
              )}

              {/* Form Option 3: Net Banking */}
              {paymentMethod === 'netbanking' && (
                <form onSubmit={handleProcessPayment} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-2">Select Your Bank</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Citibank'].map(
                        (bank) => (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setSelectedBank(bank)}
                            className={`p-2.5 rounded-xl border text-left font-bold transition text-xs ${
                              selectedBank === bank
                                ? 'border-teal-600 bg-teal-50 text-teal-900'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            🏦 {bank}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-black text-sm shadow-md transition disabled:opacity-50"
                  >
                    {isProcessing ? 'Connecting to Bank Gateway...' : `Proceed to ${selectedBank} ($${selectedInvoice.totalAmount})`}
                  </button>
                </form>
              )}

              {/* Form Option 4: Wallet / Co-pay */}
              {paymentMethod === 'wallet' && (
                <form onSubmit={handleProcessPayment} className="space-y-4">
                  <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-teal-900 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Prepaid Health Balance</span>
                    <p className="text-xl font-black text-teal-950">$500.00 Available</p>
                    <p className="text-[11px] text-teal-800">Co-pay & clinical insurance credit line applied automatically.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-black text-sm shadow-md transition disabled:opacity-50"
                  >
                    {isProcessing ? 'Deducting from Health Wallet...' : `Deduct $${selectedInvoice.totalAmount} from Balance`}
                  </button>
                </form>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Official Receipt Viewer Modal */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title="Official Healthcare Receipt"
          subtitle={`Receipt: ${viewingReceipt.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="p-4 space-y-4 text-xs bg-slate-50/50 rounded-2xl border border-slate-200/80">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900">Apex Multispecialty Hospital</h4>
                <p className="text-[11px] text-slate-500">Medical Enclave, Central Healthcare Hub</p>
                <p className="text-[11px] text-teal-700 font-bold">GST / Tax Reg: HEALTH-2026-TAX</p>
              </div>
              <Badge variant="success">PAID & SETTLED</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block font-bold">Patient Name:</span>
                <span className="font-bold text-slate-800">{user?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Transaction Ref:</span>
                <span className="font-mono font-bold text-teal-800">{viewingReceipt.transactionRef || 'TEST-TXN-001'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Date Paid:</span>
                <span className="font-bold text-slate-800">
                  {new Date(viewingReceipt.paymentDate || viewingReceipt.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Payment Method:</span>
                <span className="font-bold text-slate-800 capitalize">{viewingReceipt.paymentMethod || 'Online'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 pb-1">
                    <th className="py-1">Description</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReceipt.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-800">{item.description}</td>
                      <td className="py-1.5 text-right font-bold text-slate-900">₹{item.total}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-2 font-black text-slate-900">Total Settled:</td>
                    <td className="pt-2 text-right font-black text-teal-800 text-sm">
                      ₹{viewingReceipt.totalAmount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
