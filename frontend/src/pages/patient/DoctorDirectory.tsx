import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Doctor } from '../../types';
import {
  Search,
  Stethoscope,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Star,
  Phone,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles,
  Building2,
  CreditCard,
  QrCode,
  ArrowRight,
  Receipt,
  CheckCircle2,
  Printer,
  Info,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [filterMode, setFilterMode] = useState<'doctors' | 'clinics'>('doctors');

  // Booking & Checkout Flow State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reason, setReason] = useState('General Consultation');
  const [checkoutStep, setCheckoutStep] = useState<'slot_select' | 'review_pay' | 'confirmed'>('slot_select');
  const [paymentMethod, setPaymentMethod] = useState<'upi_test' | 'card_test' | 'netbanking_test' | 'pay_at_clinic'>('upi_test');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingData, setConfirmedBookingData] = useState<any | null>(null);

  // Selected Clinic Profile Modal
  const [selectedClinicProfile, setSelectedClinicProfile] = useState<any | null>(null);

  const specialties = [
    { name: 'All' },
    { name: 'Cardiology' },
    { name: 'General Medicine' },
    { name: 'Pediatrics' },
    { name: 'Dermatology' },
    { name: 'Neurology' },
    { name: 'Orthopedics' },
  ];

  const fetchDirectoryData = async () => {
    try {
      setIsLoading(true);
      const [docRes, clinicRes] = await Promise.all([
        api.get(`/doctors?specialty=${encodeURIComponent(selectedSpecialty)}&search=${encodeURIComponent(search)}`),
        api.get(`/clinics?search=${encodeURIComponent(search)}`),
      ]);

      if (docRes.data.success) setDoctors(docRes.data.data);
      if (clinicRes.data.success) setClinics(clinicRes.data.data);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDirectoryData();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedSpecialty]);

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !bookingDate) return;
    const fetchSlots = async () => {
      try {
        setIsLoadingSlots(true);
        setSelectedSlot(null);
        setBookingError(null);
        const res = await api.get(`/doctors/${selectedDoctor._id}/slots?date=${bookingDate}`);
        if (res.data.success) {
          setSlots(res.data.data.slots || []);
        }
      } catch (err: any) {
        setBookingError(err.response?.data?.message || 'Could not load slots');
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, bookingDate]);

  const handleOpenBooking = (doc: Doctor) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedDoctor(doc);
    setCheckoutStep('slot_select');
    setSelectedSlot(null);
    setBookingError(null);
    setConfirmedBookingData(null);
  };

  const handleProceedToCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      setBookingError('Please select a time slot.');
      return;
    }
    setCheckoutStep('review_pay');
  };

  const handleFinalizeBookingAndPay = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    try {
      setIsSubmitting(true);
      setBookingError(null);

      const [sh, sm] = selectedSlot.split(':').map(Number);
      const endMinutes = sh * 60 + sm + 30;
      const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0');
      const endM = (endMinutes % 60).toString().padStart(2, '0');
      const endTime = `${endH}:${endM}`;

      // 1. Create Appointment (creates linked pending invoice)
      const apptRes = await api.post('/appointments', {
        patientId: user?.patientId || user?.profile?._id,
        doctorId: selectedDoctor._id,
        clinicId: selectedDoctor.clinicId?._id,
        appointmentDate: `${bookingDate}T00:00:00.000Z`,
        startTime: selectedSlot,
        endTime,
        reason,
        type: 'in-person',
      });

      if (!apptRes.data.success) {
        throw new Error(apptRes.data.message || 'Failed to book appointment');
      }

      const appointment = apptRes.data.data;
      const invoiceNumber = appointment.invoice?.invoiceNumber;

      // 2. If online payment selected, pay invoice to Clinic
      if (invoiceNumber && paymentMethod !== 'pay_at_clinic') {
        await api.post(`/invoices/${invoiceNumber}/pay`, {
          paymentMethod,
        });
      }

      setConfirmedBookingData({
        appointment,
        doctor: selectedDoctor,
        clinic: selectedDoctor.clinicId,
        date: bookingDate,
        time: selectedSlot,
        paymentMethod,
        amount: selectedDoctor.consultationFee || 500,
        invoiceNumber,
      });

      setCheckoutStep('confirmed');
    } catch (err: any) {
      setBookingError(err.response?.data?.message || err.message || 'Failed to complete booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Three-Sided Healthcare Directory
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Find Clinics & Consulting Doctors
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Discover accredited clinics, consult verified physicians, and book appointments with upfront fee disclosure
        </p>
      </div>

      {/* Switcher & Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/60 self-start">
            <button
              onClick={() => setFilterMode('doctors')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                filterMode === 'doctors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" /> By Doctor ({doctors.length})
            </button>
            <button
              onClick={() => setFilterMode('clinics')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                filterMode === 'clinics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" /> By Clinic ({clinics.length})
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-teal-600 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by physician name, clinic name, city, specialty..."
              className="w-full rounded-2xl border border-slate-200 pl-11 pr-4 py-2.5 text-xs placeholder-slate-400 focus:border-teal-500 focus:outline-none bg-slate-50/50"
            />
          </div>
        </div>

        {filterMode === 'doctors' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            {specialties.map((spec) => (
              <button
                key={spec.name}
                onClick={() => setSelectedSpecialty(spec.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition duration-150 ${
                  selectedSpecialty === spec.name
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {spec.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Directory Listings */}
      {isLoading ? (
        <LoadingSpinner message="Searching verified clinics and physicians..." />
      ) : filterMode === 'clinics' ? (
        /* CLINIC VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clinics.map((clinic) => (
            <div
              key={clinic._id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-teal-300 transition duration-200 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">{clinic.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600" /> {clinic.city}, {clinic.state}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Verified Clinic</Badge>
                </div>

                <p className="text-xs text-slate-600 mt-3">{clinic.address}</p>

                {/* Affiliated Doctors Pill List */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                    Associated Doctors ({clinic.doctorCount || clinic.doctors?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.doctors && clinic.doctors.length > 0 ? (
                      clinic.doctors.map((m: any) => (
                        <button
                          key={m.membershipId}
                          onClick={() => {
                            if (m.doctor) {
                              handleOpenBooking({ ...m.doctor, clinicId: clinic });
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-[11px] border border-teal-200/60 transition flex items-center gap-1"
                        >
                          <Stethoscope className="w-3 h-3 text-teal-600" />
                          Dr. {m.doctor?.name} ({m.doctor?.specialty})
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Multi-specialty physicians available</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Standard Consultation</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ₹{clinic.consultationFeeDefault || 500}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedClinicProfile(clinic)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition"
                >
                  View Clinic Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* DOCTORS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div
              key={doctor._id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-teal-300 transition duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-teal-600/20 group-hover:scale-105 transition">
                    {doctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                  </div>
                  <Badge variant={doctor.isVerified ? 'success' : 'default'}>
                    {doctor.isVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-black text-base text-slate-900 group-hover:text-teal-700 transition">
                    {doctor.title} {doctor.name}
                  </h3>
                  <p className="text-xs font-bold text-teal-800 mt-0.5">{doctor.specialty}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {doctor.registrationNumber} • {doctor.experienceYears || 10}+ yrs exp.
                  </p>
                </div>

                {/* Clinic Association Badge */}
                <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs">
                  <span className="text-[10px] text-amber-800 font-extrabold block uppercase tracking-wider">
                    Associated Clinic:
                  </span>
                  <p className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    {doctor.clinicId?.name || 'Apex Multispecialty Hospital & Clinic'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {doctor.clinicId?.city || 'New Delhi'}, {doctor.clinicId?.state || 'Delhi'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Consultation Fee</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    ₹{doctor.consultationFee}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenBooking(doctor)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-600/20 transition flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" /> Book Consultation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPREHENSIVE BOOKING & CHECKOUT MODAL */}
      {selectedDoctor && (
        <Modal
          isOpen={!!selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          title={
            checkoutStep === 'confirmed'
              ? 'Appointment & Payment Confirmed'
              : checkoutStep === 'review_pay'
              ? 'Review & Pay Consultation Fee'
              : `Book with Dr. ${selectedDoctor.name}`
          }
          subtitle={
            checkoutStep === 'confirmed'
              ? 'Your consultation booking is finalized and synchronized with the clinic'
              : `Associated with ${selectedDoctor.clinicId?.name || 'Doctor X Clinic'}`
          }
          maxWidth="lg"
        >
          {bookingError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* STEP 1: SLOT SELECT */}
          {checkoutStep === 'slot_select' && (
            <form onSubmit={handleProceedToCheckout} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Consultation Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chief Reason for Visit</label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="General checkup, heart consultation, etc."
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold text-slate-700">Available Consultation Slots *</label>
                  {selectedSlot && (
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-mono">
                      Selected Slot: {selectedSlot}
                    </span>
                  )}
                </div>

                {isLoadingSlots ? (
                  <p className="text-slate-400 py-3 text-center text-xs">Checking doctor schedule and collisions...</p>
                ) : slots.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center text-xs font-medium">
                    Doctor is not available or fully booked on this date. Please pick another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {slots.map((slot: any) => {
                      const slotTime = slot.time || slot.startTime;
                      const isAvailable = slot.isAvailable !== undefined ? slot.isAvailable : !slot.isBooked;
                      const isSelected = selectedSlot === slotTime;

                      return (
                        <button
                          type="button"
                          key={slotTime}
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slotTime)}
                          className={`py-2 px-1 text-center font-mono rounded-xl border transition text-xs font-semibold ${
                            !isAvailable
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs'
                              : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {slotTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSlot}
                  className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  Proceed to Payment Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW & CHECKOUT (Patient Pays Clinic) */}
          {checkoutStep === 'review_pay' && (
            <div className="space-y-4 text-xs">
              {/* Upfront Disclosure Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                <Building2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-sm block text-amber-900">
                    Payment Recipient: {selectedDoctor.clinicId?.name || 'Apex Multispecialty Hospital & Clinic'}
                  </span>
                  <span className="text-[11px] text-amber-800">
                    In this healthcare model, patient payments are received directly by the clinic. Doctor consultation fees are settled separately per clinic agreement.
                  </span>
                </div>
              </div>

              {/* Consultation Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Consulting Physician:</span>
                  <span className="font-bold text-slate-900">
                    Dr. {selectedDoctor.name} ({selectedDoctor.specialty})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Scheduled Date & Time:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {bookingDate} at {selectedSlot}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Consultation Fee:</span>
                  <span className="font-bold text-slate-900 font-mono">₹{selectedDoctor.consultationFee}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Clinic Service & Booking Fee:</span>
                  <span className="font-bold text-emerald-700">₹0 (Waived)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Applicable Taxes (GST):</span>
                  <span className="font-bold text-slate-700">₹0 (Medical Exempt)</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-black text-slate-900">
                  <span>Total Amount Payable:</span>
                  <span className="text-emerald-700 font-mono text-base">₹{selectedDoctor.consultationFee}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi_test')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      paymentMethod === 'upi_test'
                        ? 'border-teal-500 bg-teal-50/80 text-teal-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mx-auto mb-1 text-teal-600" />
                    <span className="block text-[11px]">Instant UPI QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card_test')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      paymentMethod === 'card_test'
                        ? 'border-teal-500 bg-teal-50/80 text-teal-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1 text-teal-600" />
                    <span className="block text-[11px]">Debit/Credit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking_test')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      paymentMethod === 'netbanking_test'
                        ? 'border-teal-500 bg-teal-50/80 text-teal-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mx-auto mb-1 text-teal-600" />
                    <span className="block text-[11px]">Net Banking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_at_clinic')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      paymentMethod === 'pay_at_clinic'
                        ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <span className="block text-[11px]">Pay at Clinic</span>
                  </button>
                </div>
              </div>

              {/* Cancellation Policy Disclosure */}
              <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 block">Refund & Cancellation Policy:</span>
                <p>• Free cancellation up to 2 hours prior to scheduled appointment slot.</p>
                <p>• Eligible refunds are credited directly via reversal entry to your original payment method.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('slot_select')}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeBookingAndPay}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    'Processing Payment...'
                  ) : paymentMethod === 'pay_at_clinic' ? (
                    'Confirm Booking (Pay on Arrival)'
                  ) : (
                    `Pay ₹${selectedDoctor.consultationFee} & Confirm`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMED */}
          {checkoutStep === 'confirmed' && confirmedBookingData && (
            <div className="space-y-4 text-xs text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Consultation Booked Successfully!</h3>
                <p className="text-slate-500 mt-1">
                  Appointment Reference: <span className="font-mono font-bold text-teal-800">{confirmedBookingData.appointment.appointmentId}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 max-w-md mx-auto text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Doctor:</span>
                  <span className="font-bold text-slate-900">Dr. {confirmedBookingData.doctor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Clinic Recipient:</span>
                  <span className="font-bold text-teal-800">{confirmedBookingData.clinic?.name || 'Green Life Clinic'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Date & Time:</span>
                  <span className="font-mono font-bold text-slate-900">{confirmedBookingData.date} at {confirmedBookingData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Total Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{confirmedBookingData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Payment Method:</span>
                  <span className="font-bold text-slate-800 capitalize">{confirmedBookingData.paymentMethod?.replace('_test', '')}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Booking Voucher
                </button>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* CLINIC PROFILE DETAILS MODAL */}
      {selectedClinicProfile && (
        <Modal
          isOpen={!!selectedClinicProfile}
          onClose={() => setSelectedClinicProfile(null)}
          title={selectedClinicProfile.name}
          subtitle={`Clinic Code: ${selectedClinicProfile.code} • ${selectedClinicProfile.city}, ${selectedClinicProfile.state}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Clinic Location</span>
              <p className="font-bold text-slate-800 mt-0.5">{selectedClinicProfile.address}</p>
              <p className="text-slate-500">{selectedClinicProfile.city}, {selectedClinicProfile.state} - {selectedClinicProfile.zipCode}</p>
              <p className="text-teal-700 font-bold mt-1">Phone: {selectedClinicProfile.phone}</p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-2">Doctors Practicing at this Clinic:</span>
              <div className="space-y-2">
                {selectedClinicProfile.doctors?.map((m: any) => (
                  <div
                    key={m.membershipId}
                    className="p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900">Dr. {m.doctor?.name}</h4>
                      <p className="text-[11px] text-teal-700 font-semibold">{m.doctor?.specialty}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClinicProfile(null);
                        handleOpenBooking({ ...m.doctor, clinicId: selectedClinicProfile });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700"
                    >
                      Book Visit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedClinicProfile(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
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
