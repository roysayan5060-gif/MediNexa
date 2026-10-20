import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  Stethoscope,
  HeartPulse,
  Building2,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<'patient' | 'doctor' | 'clinic'>('patient');

  // Available clinics for doctor association
  const [clinics, setClinics] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    // Patient fields
    gender: 'female',
    dateOfBirth: '1995-01-01',
    bloodGroup: 'O+',
    privacyConsent: false,
    // Doctor fields
    specialty: 'Cardiology',
    registrationNumber: '',
    consultationFee: 500,
    clinicId: '',
    // Clinic fields
    clinicName: '',
    ownerName: '',
    address: '',
    city: 'New Delhi',
    state: 'Delhi',
    zipCode: '110001',
    defaultDoctorSharePercentage: 70,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load clinics for doctor association dropdown
    const loadClinics = async () => {
      try {
        const res = await api.get('/clinics');
        if (res.data.success) {
          setClinics(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => ({ ...prev, clinicId: res.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to load clinics list', err);
      }
    };
    loadClinics();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          name === 'consultationFee' || name === 'defaultDoctorSharePercentage'
            ? Number(value)
            : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (role === 'patient' && !formData.privacyConsent) {
      setError('Please acknowledge and consent to the privacy & digital healthcare policy to register.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      ...formData,
      role: role === 'clinic' ? 'clinic_admin' : role,
      name: role === 'clinic' ? formData.clinicName || formData.name : formData.name,
    };

    const res = await register(payload);
    setIsSubmitting(false);

    if (res.success) {
      localStorage.setItem('doctorx_saved_email', formData.email.trim());
      localStorage.setItem('doctorx_remember_email', 'true');
      if (role === 'doctor') navigate('/doctor/dashboard');
      else if (role === 'clinic') navigate('/clinic/dashboard');
      else navigate('/patient/portal');
    } else {
      setError(res.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-mesh-light flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-700 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-teal-700/30">
            <Stethoscope className="w-7 h-7 text-white stroke-[2.3]" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Create Doctor X Account
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Join the Three-Sided Digital Healthcare Network
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-teal-900/10 rounded-3xl border border-slate-200/80 sm:px-10">
          {/* Three-Sided Role Toggle */}
          <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1 mb-6 border border-slate-200/60 text-center">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                role === 'patient'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="w-4 h-4" /> Patient
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                role === 'doctor'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-4 h-4" /> Doctor
            </button>
            <button
              type="button"
              onClick={() => setRole('clinic')}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                role === 'clinic'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" /> Clinic
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200/60 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Common Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {role === 'clinic' ? 'Admin / Owner Full Name *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={
                    role === 'doctor'
                      ? 'Dr. Rajesh Nair'
                      : role === 'clinic'
                      ? 'Dr. Anita Roy'
                      : 'Eleanor Vance'
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {role === 'clinic' ? 'Business Email Address *' : 'Email Address *'}
                </label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@doctorx.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                />
              </div>
            </div>

            {/* 1. Patient Specific Fields */}
            {role === 'patient' && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Patient Privacy Consent */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                    <input
                      type="checkbox"
                      name="privacyConsent"
                      checked={formData.privacyConsent}
                      onChange={handleChange}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                    <span>
                      I consent to the collection and processing of my health information in accordance with
                      the <span className="font-bold text-teal-700 underline">Privacy Notice & Indian Digital Personal Data Protection (DPDP) Act</span>.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* 2. Doctor Specific Fields */}
            {role === 'doctor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Medical Specialty *
                  </label>
                  <select
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Gynecology">Gynecology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State Council Reg. Number *
                  </label>
                  <input
                    type="text"
                    required
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. MCI-DEL-88192"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Consultation Fee (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    name="consultationFee"
                    value={formData.consultationFee}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Associated Clinic
                  </label>
                  <select
                    name="clinicId"
                    value={formData.clinicId}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                  >
                    {clinics.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 3. Clinic Specific Fields */}
            {role === 'clinic' && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinic / Hospital Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="clinicName"
                      value={formData.clinicName}
                      onChange={handleChange}
                      placeholder="e.g. Green Life Clinic"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinical Establishment Reg. No.
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      placeholder="e.g. CEA-DEL-2026-90"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinic Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="12 Health Crescent, Green Park"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="New Delhi"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Delhi"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Default Doctor Split (% to Doctor)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      name="defaultDoctorSharePercentage"
                      value={formData.defaultDoctorSharePercentage}
                      onChange={handleChange}
                      placeholder="70"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                    <span className="text-[10px] text-slate-400">e.g. 70% to doctor, 30% retained by clinic</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Default Consultation Fee (₹ INR)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      name="consultationFee"
                      value={formData.consultationFee}
                      onChange={handleChange}
                      placeholder="500"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-2 py-3 px-4 rounded-2xl shadow-lg text-sm font-bold text-white transition disabled:opacity-50 mt-4 ${
                role === 'clinic'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : role === 'doctor'
                  ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
                  : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25'
              }`}
            >
              {isSubmitting
                ? 'Creating Verified Account...'
                : `Register as ${role === 'clinic' ? 'Clinic' : role === 'doctor' ? 'Doctor' : 'Patient'}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-teal-700 hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
