import React from 'react';
import { Link } from 'react-router-dom';
import { Coins, ArrowLeft, Stethoscope, CheckCircle2 } from 'lucide-react';

export const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900 font-black text-sm">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span>Doctor X Healthcare</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fair Consultation Financial Policy</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Consultation Cancellation & Refund Policy
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Doctor X Platform • Updated October 2026
          </p>

          <div className="prose prose-sm text-slate-600 text-xs leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Patient-Initiated Cancellations</h2>
              <p>
                Patients may cancel a scheduled consultation directly through their patient dashboard at least <strong>2 hours prior</strong> to the appointment start time for a 100% full refund to the original payment method (UPI / card).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Doctor or Clinic Cancellations</h2>
              <p>
                In the rare event that an attending clinician or clinic facility must reschedule or cancel an appointment due to unforeseen surgical commitments or clinical emergencies:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Patients are immediately notified via SMS and in-app alert.</li>
                <li>Patients may choose between immediate automated rescheduling or an automatic 100% refund.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Refund Processing Timelines</h2>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Banking Timelines
                </div>
                <p className="text-slate-600 text-xs">
                  • <strong>UPI Transfers:</strong> Typically credited back to the patient’s bank account within 2 to 24 hours.<br />
                  • <strong>Credit & Debit Cards:</strong> Processed via the banking network within 3 to 5 business days.<br />
                  • <strong>Pay-at-Clinic Bookings:</strong> No upfront payment was deducted, so no electronic refund is required.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Support & Disputed Charges</h2>
              <p>
                If you encounter any discrepancy in your billing or refund status, email our billing team at <strong className="text-slate-900">billing@doctorx.com</strong> with your Invoice / Appointment ID for immediate assistance.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
