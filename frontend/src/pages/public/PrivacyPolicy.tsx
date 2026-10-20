import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Stethoscope, Lock, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
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
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Digital Personal Data Protection (DPDP) Act 2023 Aligned</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Privacy Policy & Health Data Governance
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Last Updated: October 2026 • Version 2.4 • Effective for all Doctor X users
          </p>

          <div className="prose prose-sm text-slate-600 text-xs leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">1. Introduction & Scope</h2>
              <p>
                Doctor X Technologies Pvt. Ltd. operates this three-sided healthcare platform connecting patients, licensed medical practitioners, and registered clinics. We treat personal and sensitive medical data with the highest fiduciary diligence in compliance with the Digital Personal Data Protection Act 2023 (DPDP) and applicable electronic medical record standards.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">2. Categories of Data Collected</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Identity & Demographic Information:</strong> Full name, phone number, real registered email address, date of birth, biological gender, and blood group.</li>
                <li><strong>Clinical Consultation Records:</strong> Diagnosis summaries, vital signs (BP, SpO2, heart rate), chief symptoms, physician notes, and structured digital prescriptions.</li>
                <li><strong>WhatsApp Dispatch Logs:</strong> Encrypted message transmission timestamps, verified recipient phone numbers, and delivery state tracking.</li>
                <li><strong>Financial & Settlement Data:</strong> Invoice numbers, transaction IDs, payment methods (UPI, debit/credit cards), and clinic-doctor settlement ledger allocations.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">3. Purpose of Processing & Consent</h2>
              <p>
                Data is processed strictly for providing medical consultation management, longitudinal EHR storage, scheduling appointments, dispatching e-prescriptions, and facilitating clinic financial reconciliation. We never sell, rent, or trade patient personal health information to third-party advertisers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">4. Bank-Grade Security Protections</h2>
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-950 text-xs">
                  <Lock className="w-4 h-4 text-teal-700" /> Technical Safeguards
                </div>
                <p className="text-teal-900 text-xs">
                  All communication between your client device and our servers uses Transport Layer Security (TLS 1.3) with 256-bit AES encryption. Passwords and sensitive authentication tokens are hashed using bcrypt with salt rounds. Database backups are continuously encrypted at rest.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">5. Patient Rights under DPDP Act 2023</h2>
              <p>
                As a patient, you retain the legal right to access your complete medical history, request corrections to erroneous personal demographic details, and revoke consent in accordance with regulatory retention standards for clinical health records.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-slate-900">6. Grievance Redressal Officer</h2>
              <p>
                In compliance with the DPDP Act 2023, you may contact our designated Data Protection & Grievance Officer:
              </p>
              <div className="p-3 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700 space-y-0.5">
                <p><strong>Name:</strong> Grievance Redressal Office, Doctor X</p>
                <p><strong>Email:</strong> privacy@doctorx.com</p>
                <p><strong>Response Time:</strong> Within 48 business hours</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
