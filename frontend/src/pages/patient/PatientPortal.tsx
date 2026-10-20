import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  FileText,
  Clock,
  Heart,
  Stethoscope,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  User,
  Plus,
  HeartPulse,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PatientPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [portalData, setPortalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        setIsLoading(true);
        const [patientRes, apptRes, rxRes, remRes] = await Promise.all([
          user?.patientId ? api.get(`/patients/${user.patientId}`) : Promise.resolve({ data: { success: false } }),
          api.get('/appointments?limit=5'),
          api.get('/prescriptions?limit=5'),
          api.get('/reminders?status=pending'),
        ]);

        setPortalData({
          patient: patientRes.data?.data?.patient || user?.profile,
          appointments: apptRes.data?.data || [],
          prescriptions: rxRes.data?.data || [],
          reminders: remRes.data?.data || [],
        });
      } catch (err) {
        console.error('Failed to load patient portal:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortalData();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner message="Loading your health portal..." />;
  }

  const patient = portalData?.patient;
  const nextAppointment = portalData?.appointments?.find((a: any) => a.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* High-energy Patient Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-blue-800 to-indigo-900 p-6 md:p-8 text-white shadow-2xl shadow-sky-900/20">
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-xs font-bold mb-2">
              <HeartPulse className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
              <span>Personal Health Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Hello, {user?.name}
            </h1>
            <p className="text-xs md:text-sm text-sky-100/90 mt-1 max-w-xl">
              {patient?.patientId ? (
                <>
                  Health ID: <span className="font-mono font-bold text-sky-200">{patient.patientId}</span> • Blood Group:{' '}
                  <span className="font-black bg-white/15 px-2 py-0.5 rounded-lg text-white border border-white/20">
                    {patient.bloodGroup || 'Unknown'}
                  </span>
                </>
              ) : (
                'Review your verified medical records, active prescriptions, and appointments.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/patient/doctors')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 text-teal-950 rounded-2xl text-xs font-black shadow-lg shadow-teal-500/20 transition transform hover:-translate-y-0.5"
            >
              <Stethoscope className="w-4 h-4 text-teal-950" /> Book Consultation
            </button>
            <button
              onClick={() => navigate('/patient/prescriptions')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold backdrop-blur-md transition border border-white/20 shadow-sm"
            >
              <FileText className="w-4 h-4 text-sky-300" /> My Prescriptions
            </button>
          </div>
        </div>
      </div>

      {/* Colorful Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Next Visit Card */}
        <div className="bg-white p-6 rounded-3xl border border-sky-100/80 shadow-xs hover:shadow-lg transition duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Visit</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-110 transition">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            {nextAppointment ? (
              <div className="space-y-1">
                <p className="text-base font-black text-slate-900">
                  {new Date(nextAppointment.appointmentDate).toLocaleDateString()} at {nextAppointment.startTime}
                </p>
                <p className="text-xs text-sky-700 font-bold">
                  Dr. {nextAppointment.doctorId?.name} ({nextAppointment.doctorId?.specialty})
                </p>
                <p className="text-xs text-slate-500 line-clamp-1">{nextAppointment.reason}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 font-medium">No upcoming appointments scheduled.</p>
            )}
          </div>
          <button
            onClick={() => navigate('/patient/appointments')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 mt-4 pt-3 border-t border-slate-100"
          >
            Manage appointments <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Prescriptions */}
        <div className="bg-white p-6 rounded-3xl border border-teal-100/80 shadow-xs hover:shadow-lg transition duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Prescriptions</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-110 transition">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{portalData?.prescriptions?.length || 0}</div>
            <p className="text-xs text-teal-700 font-semibold mt-1">Verified clinician medication orders</p>
          </div>
          <button
            onClick={() => navigate('/patient/prescriptions')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-4 pt-3 border-t border-slate-100"
          >
            View prescriptions <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Health Reminders */}
        <div className="bg-white p-6 rounded-3xl border border-amber-100/80 shadow-xs hover:shadow-lg transition duration-200 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Health Reminders</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-110 transition">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{portalData?.reminders?.length || 0}</div>
            <p className="text-xs text-amber-700 font-semibold mt-1">Due follow-ups & review items</p>
          </div>
          <button
            onClick={() => navigate('/patient/records')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-4 pt-3 border-t border-slate-100"
          >
            Review health items <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Your Consultations</h3>
            <button
              onClick={() => navigate('/patient/doctors')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Book New
            </button>
          </div>

          {portalData?.appointments?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No appointment records found.</p>
          ) : (
            <div className="space-y-3">
              {portalData?.appointments?.map((apt: any) => (
                <div
                  key={apt._id}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 transition flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      Dr. {apt.doctorId?.name}
                    </span>
                    <span className="text-[11px] text-teal-700 font-bold">
                      {apt.doctorId?.specialty} • {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.startTime}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{apt.reason}</span>
                  </div>
                  <Badge variant={apt.status === 'confirmed' ? 'brand' : apt.status === 'completed' ? 'success' : 'neutral'}>
                    {apt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reminders List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Health Reminders & Notifications</h3>

          {portalData?.reminders?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">You have no pending reminders.</p>
          ) : (
            <div className="space-y-3">
              {portalData?.reminders?.map((rem: any) => (
                <div key={rem._id} className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/60 to-orange-50/30 border border-amber-200/70 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900">{rem.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{rem.description}</p>
                    <span className="text-[10px] text-amber-800 font-extrabold mt-1 block">
                      Due: {new Date(rem.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
