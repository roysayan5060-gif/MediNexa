import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope,
  HeartPulse,
  Building2,
  Calendar,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  PhoneCall,
  Lock,
  ChevronDown,
  ChevronUp,
  Coins,
  FileText,
  UserPlus,
  LogIn,
  AlertTriangle,
  Award,
  Users,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSpecialty) {
      navigate(`/patient/doctors?specialty=${encodeURIComponent(searchSpecialty)}`);
    } else {
      navigate('/patient/doctors');
    }
  };

  const specialties = [
    { name: 'Cardiology', icon: '❤️', doctors: '18 Specialists', desc: 'Heart care, ECG review & hypertension' },
    { name: 'General Medicine', icon: '🩺', doctors: '32 Specialists', desc: 'Primary diagnosis, viral fevers & preventive care' },
    { name: 'Pediatrics', icon: '👶', doctors: '24 Specialists', desc: 'Child health, immunization & growth checks' },
    { name: 'Orthopedics', icon: '🦴', doctors: '14 Specialists', desc: 'Joint pain, fractures & spine management' },
    { name: 'Dermatology', icon: '✨', doctors: '16 Specialists', desc: 'Skin, hair care & allergic disorders' },
    { name: 'Neurology', icon: '🧠', doctors: '11 Specialists', desc: 'Headaches, nerve care & stroke prevention' },
    { name: 'Gynecology', icon: '🌸', doctors: '19 Specialists', desc: 'Maternal health, prenatal care & wellness' },
    { name: 'Psychiatry', icon: '🌱', doctors: '12 Specialists', desc: 'Mental wellness, anxiety & behavioral therapy' },
  ];

  const faqs = [
    {
      q: 'How does the WhatsApp Digital Prescription feature work?',
      a: 'After conducting your consultation, the attending doctor generates an authenticated e-prescription on the Doctor X prescription builder. With 1 click, the clinical summary, medication schedule, food instructions, and doctor digital signature are formatted and delivered directly to the patient’s WhatsApp number.',
    },
    {
      q: 'Can a single doctor associate with multiple clinics in Doctor X?',
      a: 'Yes. Doctor X is engineered as a true three-sided platform. A doctor can hold active clinical memberships across multiple clinics, configure distinct working hours and consultation fees for each clinic, and receive itemized settlement reports for every OPD location.',
    },
    {
      q: 'How are patient payments and doctor fee settlements handled?',
      a: 'Patients can pay for their consultation online via UPI, debit/credit cards, and net banking (or choose pay-at-clinic). The incoming payment is recorded in the clinic’s digital ledger. The clinic retains its agreed service commission while doctor settlements are transparently calculated and logged in the doctor’s earnings balance.',
    },
    {
      q: 'Is Doctor X compliant with Indian healthcare regulations and the DPDP Act?',
      a: 'Yes. Doctor X is aligned with the Digital Personal Data Protection (DPDP) Act 2023 and the National Medical Commission (NMC) Telemedicine Practice Guidelines. All clinical health records (EHR) and prescriptions are encrypted in transit and at rest using bank-grade 256-bit TLS.',
    },
    {
      q: 'Can patients book available consultation slots without double-booking?',
      a: 'Absolutely. Doctor X features real-time collision prevention. When a patient picks a doctor and date, only genuine unbooked 30-minute time slots are displayed, completely eliminating conflicting appointments.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. TOP EMERGENCY BANNER */}
      <div className="bg-slate-900 text-slate-300 text-[11px] px-4 py-2 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold text-white uppercase tracking-wider">Medical Emergency Alert:</span>
            <span>If you require urgent or emergency medical resuscitation, please immediately dial <strong className="text-rose-400 font-bold">112</strong> or <strong className="text-rose-400 font-bold">108</strong>.</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="hidden md:inline">24x7 Platform Helpline:</span>
            <a href="tel:1800100200" className="text-teal-400 font-bold hover:underline">1800-DOCTOR-X</a>
            <span>•</span>
            <span className="text-emerald-400 font-bold">DPDP Act Compliant</span>
          </div>
        </div>
      </div>

      {/* 2. PUBLIC STICKY HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-500 opacity-60 blur-xs group-hover:opacity-100 transition duration-300" />
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-700 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-700/30">
                <Stethoscope className="w-6 h-6 text-white stroke-[2.3]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl text-slate-900 tracking-tight">
                  Doctor <span className="text-teal-600">X</span>
                </span>
                <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200/80 font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Healthcare
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block -mt-0.5">
                Three-Sided Clinic & Telehealth Network
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
            <Link to="/patient/doctors" className="hover:text-teal-700 transition">
              Find Doctors
            </Link>
            <a href="#specialties" className="hover:text-teal-700 transition">
              Specialties
            </a>
            <a href="#how-it-works" className="hover:text-teal-700 transition">
              How It Works
            </a>
            <a href="#whatsapp-rx" className="hover:text-teal-700 transition flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Rx
            </a>
            <a href="#for-clinics" className="hover:text-teal-700 transition">
              For Clinics
            </a>
            <a href="#faqs" className="hover:text-teal-700 transition">
              FAQs
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-teal-900 hover:bg-slate-100 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" /> Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-700/20 transition transform hover:-translate-y-0.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 bg-gradient-to-b from-teal-50/40 via-sky-50/20 to-white">
        {/* Glow accents */}
        <div className="absolute top-10 left-1/3 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-teal-200/80 shadow-xs text-xs font-bold text-teal-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>India's Modern Three-Sided Digital Healthcare Platform</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">New 2.0</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Connected Healthcare for{' '}
              <span className="bg-gradient-to-r from-teal-700 via-cyan-600 to-indigo-700 bg-clip-text text-transparent">
                Doctors, Clinics & Patients
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
              Book real-time OPD and teleconsultations with top specialists, manage multi-doctor clinic schedules and UPI settlements, and receive authentic digital prescriptions directly on WhatsApp.
            </p>

            {/* Quick Interactive Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white p-2 sm:p-3 rounded-3xl shadow-xl shadow-teal-900/10 border border-slate-200 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex items-center gap-2 px-3 flex-1 w-full sm:w-auto">
                <Search className="w-5 h-5 text-teal-600 shrink-0" />
                <select
                  value={searchSpecialty}
                  onChange={(e) => setSearchSpecialty(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-none py-2"
                >
                  <option value="">Select Medical Specialty (All Specialists)</option>
                  <option value="Cardiology">Cardiology (Heart & Blood Pressure)</option>
                  <option value="General Medicine">General Medicine (Physician)</option>
                  <option value="Pediatrics">Pediatrics (Child Healthcare)</option>
                  <option value="Orthopedics">Orthopedics (Bones & Joints)</option>
                  <option value="Dermatology">Dermatology (Skin & Hair)</option>
                  <option value="Neurology">Neurology (Brain & Nerves)</option>
                  <option value="Gynecology">Gynecology (Women's Health)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md shadow-teal-700/20"
              >
                <span>Find Doctors</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Trust Badges Bar */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-semibold">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>DPDP Act 2023 Aligned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-teal-600" />
                <span>256-Bit Bank Encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-600" />
                <span>NMC Telemedicine Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Instant WhatsApp Prescriptions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THREE-WAY ECOSYSTEM SECTION */}
      <section id="how-it-works" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
              Three-Sided Healthcare Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              One Unified System for Everyone
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Clinics operate as the central business node, while doctors practice seamlessly and patients access first-rate medical care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: For Patients */}
            <div className="rounded-3xl p-8 border border-sky-100 bg-gradient-to-b from-sky-50/40 to-white hover:shadow-xl hover:shadow-sky-900/5 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
                <HeartPulse className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-100/70 px-2.5 py-1 rounded-full">
                For Patients & Families
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Effortless Consultations & Records
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Discover verified doctors by specialty and clinic location. Select genuine available 30-minute consultation slots, complete payments via UPI or card, and receive digital e-prescriptions on WhatsApp.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" /> Real-time consultation slot picker
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" /> WhatsApp prescription delivered to phone
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" /> Longitudinal medical records in one portal
                </li>
              </ul>
              <Link
                to="/patient/doctors"
                className="inline-flex items-center gap-1.5 text-xs font-black text-sky-700 hover:text-sky-900 pt-3"
              >
                Browse Available Doctors <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 2: For Doctors */}
            <div className="rounded-3xl p-8 border border-teal-200 bg-gradient-to-b from-teal-50/50 to-white shadow-lg shadow-teal-900/5 hover:shadow-xl transition duration-300 space-y-4 relative">
              <span className="absolute -top-3 right-6 bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                Clinical Workspace
              </span>
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-700/30">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2.5 py-1 rounded-full">
                For Clinicians & Specialists
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Empowered Clinical Practice
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Manage your OPD queue and teleconsultations across multiple clinics. Construct structured prescriptions with built-in dosage checks, dispatch directly to WhatsApp, and monitor daily earnings.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" /> Structured Rx pad with food/dosage labels
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" /> 1-Click WhatsApp delivery engine
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" /> Transparent earnings split & settlements
                </li>
              </ul>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-black text-teal-700 hover:text-teal-900 pt-3"
              >
                Join Doctor X as Clinician <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 3: For Clinics */}
            <div id="for-clinics" className="rounded-3xl p-8 border border-amber-100 bg-gradient-to-b from-amber-50/40 to-white hover:shadow-xl hover:shadow-amber-900/5 transition duration-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full">
                For Clinics & Polyclinics
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Complete Clinic Operations
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add and associate visiting doctors, define clinic-specific consultation fee splits, control schedules, track live OPD patient queues, and automate doctor settlement payouts.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" /> Multi-doctor schedule & queue management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" /> Automated patient invoicing & revenue ledger
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" /> Doctor payout disbursements & audit logs
                </li>
              </ul>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-900 pt-3"
              >
                Register Your Clinic Facility <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHATSAPP RX FEATURE HIGHLIGHT */}
      <section id="whatsapp-rx" className="py-20 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Proprietary Feature Innovation</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Prescriptions Delivered Directly to Patient WhatsApp
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                No more lost paper slips or difficult handwriting. Doctor X formats clinical orders into a beautifully structured digital e-prescription with full dosage instructions, meal guidelines, doctor digital approval, and delivers it instantly to the patient's WhatsApp mobile number.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                  <span className="font-mono text-xl font-bold text-emerald-300 block mb-1">0% Paper Loss</span>
                  <p className="text-slate-300">Patients retain lifetime access to medication instructions on their phone.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                  <span className="font-mono text-xl font-bold text-cyan-300 block mb-1">&lt; 30 Seconds</span>
                  <p className="text-slate-300">Clinicians approve and dispatch with 1 click right from the consultation pad.</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/40 transition transform hover:-translate-y-0.5"
                >
                  <MessageSquare className="w-4 h-4 text-slate-950" /> Experience WhatsApp Rx Now
                </Link>
              </div>
            </div>

            {/* Simulated WhatsApp Phone Frame */}
            <div className="lg:col-span-5">
              <div className="max-w-sm mx-auto bg-[#efeae2] text-slate-800 rounded-3xl p-5 shadow-2xl border-4 border-slate-700 relative">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-300/80 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Dr. Sarah Jenkins (Cardiology)</h4>
                    <span className="text-[10px] text-emerald-700 font-semibold">Apex Hospital • Verified Business</span>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-[11px] font-sans space-y-1.5 leading-relaxed relative">
                  <p className="font-bold text-teal-900 border-b pb-1">🏥 APEX MULTISPECIALTY HOSPITAL — DIGITAL PRESCRIPTION</p>
                  <p>📋 <strong>Rx ID:</strong> RX-2026-9841</p>
                  <p>👨‍⚕️ <strong>Doctor:</strong> Dr. Sarah Jenkins (Cardiologist)</p>
                  <p>🧑‍💼 <strong>Patient:</strong> Rahul Sharma (PAT-8812)</p>
                  <p className="font-bold text-slate-900 pt-1">💊 PRESCRIBED MEDICINES:</p>
                  <p className="pl-2 border-l-2 border-emerald-500 text-slate-700">
                    <strong>1. Telmisartan 40mg</strong> (Oral)<br />
                    • Timing: 1 Tablet Once Daily (OD)<br />
                    • Duration: 30 Days (After Breakfast)
                  </p>
                  <p className="text-[10px] text-slate-500 pt-1">✅ Digitally Approved & DPDP Act Verified</p>
                  <div className="text-right text-[9px] text-slate-400 font-mono">10:42 AM ✓✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. MEDICAL SPECIALTIES SECTION */}
      <section id="specialties" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
              Clinical Coverage
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              Consult Specialists Across All Disciplines
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Every clinician on Doctor X is verified against the National Medical Commission (NMC) professional registration records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {specialties.map((spec) => (
              <div
                key={spec.name}
                onClick={() => navigate(`/patient/doctors?specialty=${encodeURIComponent(spec.name)}`)}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 hover:border-teal-400 hover:shadow-lg transition duration-200 cursor-pointer group space-y-2"
              >
                <div className="text-3xl mb-1">{spec.icon}</div>
                <h3 className="font-black text-sm text-slate-900 group-hover:text-teal-700 transition">
                  {spec.name}
                </h3>
                <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  {spec.doctors}
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">{spec.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center pt-8">
            <Link
              to="/patient/doctors"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-xs transition"
            >
              <Users className="w-4 h-4 text-teal-600" /> View All 150+ Verified Specialists
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section id="faqs" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
              Clear Answers
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-3">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Everything you need to know about booking, clinic operations, and legal compliance.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 text-xs text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. MARKET-READY CONVERSION CALL TO ACTION */}
      <section className="py-16 bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Join 25,000+ Consultations Successfully Completed</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Ready to Transform Your Healthcare Experience?
          </h2>
          <p className="text-xs sm:text-sm text-teal-100/90 max-w-xl mx-auto leading-relaxed">
            Whether you are a patient looking for compassionate specialists, a clinician aiming to streamline prescribing, or a clinic seeking automated operations — Doctor X is ready for you.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/patient/doctors"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 text-teal-950 font-black text-xs sm:text-sm shadow-xl shadow-cyan-900/30 transition transform hover:-translate-y-0.5"
            >
              Find Doctors & Book Consultation
            </Link>
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition"
            >
              Register Facility / Doctor Account
            </Link>
          </div>
        </div>
      </section>

      {/* 9. PUBLIC PROFESSIONAL FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Col 1: Brand */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                  <Stethoscope className="w-5 h-5 stroke-[2.3]" />
                </div>
                <span className="font-black text-lg text-white tracking-tight">Doctor X Healthcare</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                India's three-sided digital clinic, doctor, and patient healthcare network. Empowering clinicians with instant WhatsApp prescribing, clinics with automated settlements, and patients with authenticated EMR.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-teal-400 font-mono pt-1">
                <span>ISO 27001</span> • <span>HIPAA Aligned</span> • <span>DPDP Act 2023 Compliant</span>
              </div>
            </div>

            {/* Col 2: Solutions */}
            <div className="space-y-2">
              <h4 className="font-black text-white uppercase text-[11px] tracking-wider mb-3">Platform</h4>
              <ul className="space-y-1.5">
                <li><Link to="/patient/doctors" className="hover:text-white transition">Specialist Directory</Link></li>
                <li><Link to="/register" className="hover:text-white transition">Doctor Clinical Onboarding</Link></li>
                <li><Link to="/register" className="hover:text-white transition">Clinic Network Registration</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Prescription Dispatcher</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Patient Health Records</Link></li>
              </ul>
            </div>

            {/* Col 3: Specialties */}
            <div className="space-y-2">
              <h4 className="font-black text-white uppercase text-[11px] tracking-wider mb-3">Specialties</h4>
              <ul className="space-y-1.5">
                <li><Link to="/patient/doctors?specialty=Cardiology" className="hover:text-white transition">Cardiology</Link></li>
                <li><Link to="/patient/doctors?specialty=General Medicine" className="hover:text-white transition">General Medicine</Link></li>
                <li><Link to="/patient/doctors?specialty=Pediatrics" className="hover:text-white transition">Pediatrics</Link></li>
                <li><Link to="/patient/doctors?specialty=Dermatology" className="hover:text-white transition">Dermatology</Link></li>
                <li><Link to="/patient/doctors?specialty=Orthopedics" className="hover:text-white transition">Orthopedics</Link></li>
              </ul>
            </div>

            {/* Col 4: Legal & Compliance */}
            <div className="space-y-2">
              <h4 className="font-black text-white uppercase text-[11px] tracking-wider mb-3">Compliance & Legal</h4>
              <ul className="space-y-1.5">
                <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy (DPDP Act)</Link></li>
                <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link to="/refunds" className="hover:text-white transition">Cancellation & Refunds</Link></li>
                <li><Link to="/terms#telemedicine" className="hover:text-white transition">Telemedicine Guidelines</Link></li>
                <li><a href="mailto:grievance@doctorx.com" className="hover:text-white transition">Grievance Officer</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Doctor X Healthcare Technologies Pvt. Ltd. All rights reserved.</p>
            <p className="text-slate-400">
              Disclaimer: Doctor X does not provide emergency medical services. In life-threatening emergencies, contact 112/108 immediately.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
