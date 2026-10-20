import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Stethoscope, AlertTriangle } from 'lucide-react';

export const TermsOfService: React.FC = () => {
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Healthcare Operations Agreement</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Terms of Service & Telemedicine Guidelines
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Effective Date: October 2026 • Doctor X Healthcare Technologies
          </p>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Emergency Disclaimer</span>
            </div>
            <p>
              Doctor X is a technology platform for scheduled outpatient consultations and clinic management. DO NOT use this service for emergency medical conditions, acute trauma, chest pain, or respiratory distress. In an emergency, dial 112 or 108 immediately.
            </p>
          </div>

          <div className="prose prose-sm text-slate-600 text-xs leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Role Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Patients:</strong> Must provide truthful medical history and personal demographic information. Consultations are for the registered patient only.</li>
                <li><strong>Doctors:</strong> Must hold an active, verified registration with the National Medical Commission (NMC) or State Medical Council. Prescriptions must adhere to professional medical standards.</li>
                <li><strong>Clinics:</strong> Responsible for managing facility queues, honoring scheduled time slots, and ensuring correct financial reconciliation for associated practitioners.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Telemedicine Practice Alignment</h2>
              <p>
                Teleconsultations conducted through Doctor X adhere to the Telemedicine Practice Guidelines issued by the Board of Governors in supersession of the Medical Council of India. Registered Medical Practitioners (RMPs) exercise their independent professional clinical judgment when deciding whether an in-person examination is necessary.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Electronic Prescriptions</h2>
              <p>
                Digital prescriptions generated through Doctor X contain verified practitioner details, registration numbers, itemized dosages, and electronic authorization stamps. Patients acknowledge that e-prescriptions dispatched via WhatsApp or portal are intended solely for lawful dispensation by licensed pharmacies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Payment & Financial Terms</h2>
              <p>
                Consultation fees are established by associated clinics and doctors. Payment may be completed online via UPI, debit card, or credit card, or offline at the clinic counter. Fees are routed in accordance with the clinic’s digital ledger and applicable platform arrangements.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
