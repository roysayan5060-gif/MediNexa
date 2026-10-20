import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Stethoscope,
  HeartPulse,
  Building2,
  ShieldCheck,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
} from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Pre-fill last saved login ID from device persistent storage
  const [email, setEmail] = useState(() => localStorage.getItem('doctorx_saved_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(
    () => localStorage.getItem('doctorx_remember_email') !== 'false'
  );
  const [savedEmailDetected, setSavedEmailDetected] = useState(
    () => localStorage.getItem('doctorx_saved_email') || ''
  );

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidEmailFormat = (val: string): boolean => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  };

  const handleClearSavedEmail = () => {
    localStorage.removeItem('doctorx_saved_email');
    setSavedEmailDetected('');
    setEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();

    // 1. Enforce valid email format
    if (!isValidEmailFormat(cleanEmail)) {
      setError('Please enter a valid email address (e.g., yourname@gmail.com, doctor@hospital.org).');
      return;
    }

    // 2. Require password
    if (!password || password.length < 6) {
      setError('Please enter your account password (minimum 6 characters).');
      return;
    }

    setIsSubmitting(true);

    const result = await login(cleanEmail, password);
    setIsSubmitting(false);

    if (result.success) {
      // Persist last saved login ID to device storage so it never vanishes
      if (rememberEmail) {
        localStorage.setItem('doctorx_saved_email', cleanEmail);
        localStorage.setItem('doctorx_remember_email', 'true');
      } else {
        localStorage.removeItem('doctorx_saved_email');
        localStorage.setItem('doctorx_remember_email', 'false');
      }

      const user = JSON.parse(localStorage.getItem('doctorx_user') || '{}');
      if (user.role === 'doctor') navigate('/doctor/dashboard');
      else if (user.role === 'patient') navigate('/patient/portal');
      else if (user.role === 'clinic_admin') navigate('/clinic/dashboard');
      else if (user.role === 'platform_admin') navigate('/admin/dashboard');
      else navigate('/');
    } else {
      setError(result.message || 'Login failed. Please check your registered email and password.');
    }
  };

  return (
    <div className="min-h-screen bg-mesh-light flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative ambient blurred spots */}
      <div className="absolute top-10 left-1/4 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-60 h-60 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Glowing Brand Emblem with Stethoscope */}
        <div className="relative inline-block mb-3">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-500 opacity-70 blur-md animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-700 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-teal-700/40 border border-white/30">
            <Stethoscope className="w-8 h-8 text-white stroke-[2.3]" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Doctor X Healthcare
        </h2>
        <p className="mt-1 text-sm font-semibold bg-gradient-to-r from-teal-700 via-cyan-700 to-sky-700 bg-clip-text text-transparent">
          Three-Sided Clinic, Doctor & Patient Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-2 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-teal-900/10 rounded-3xl border border-slate-200/80 sm:px-10">
          
          {/* Security Notice Pill */}
          <div className="mb-5 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Persistent Device Storage • 256-Bit SSL Secured</span>
          </div>

          {/* Saved ID Notification Banner */}
          {savedEmailDetected && (
            <div className="mb-4 p-2.5 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-between text-xs text-teal-950">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="truncate">
                  Saved ID: <strong className="font-mono text-teal-900">{savedEmailDetected}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearSavedEmail}
                className="text-[10px] text-teal-700 hover:text-rose-600 font-bold underline shrink-0 ml-2"
                title="Clear saved ID from this device"
              >
                Clear
              </button>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 font-semibold shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('not found') && (
                  <p className="mt-1 text-[11px] text-rose-800 font-normal">
                    Don't have an account with this email? Click{' '}
                    <Link to="/register" className="font-bold underline">
                      Register Account
                    </Link>{' '}
                    below to create one in seconds.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Real Registered Email Address *
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-teal-600">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. yourname@gmail.com, doctor@hospital.org"
                  className="block w-full rounded-2xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-3 focus:ring-teal-500/20 bg-slate-50/50 font-medium"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Enter your real registered email. Test email IDs cannot log in.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password *
                </label>
              </div>
              <div className="relative rounded-2xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-teal-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your account password"
                  className="block w-full rounded-2xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-3 focus:ring-teal-500/20 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span>Remember my Login ID on this laptop / device</span>
              </label>

              {email && (
                <button
                  type="button"
                  onClick={() => setEmail('')}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-2xl shadow-lg shadow-teal-600/25 text-sm font-bold text-white bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition duration-150 disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Verifying Registered Credentials...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Registration Section for Real Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <div className="rounded-2xl bg-gradient-to-br from-teal-50/60 via-cyan-50/40 to-slate-50 p-4 border border-teal-100/80">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-teal-700" />
                <h3 className="text-xs font-black uppercase tracking-wider text-teal-950">
                  Don't have an account yet?
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Register your real Doctor, Patient, or Clinic account to get instant access to the platform.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-3 text-[11px] font-bold text-slate-700">
                <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center gap-1.5 shadow-xs">
                  <HeartPulse className="w-3.5 h-3.5 text-sky-600" />
                  <span>Patient</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center gap-1.5 shadow-xs">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  <span>Doctor</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center gap-1.5 shadow-xs">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Clinic</span>
                </div>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register New Real Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
