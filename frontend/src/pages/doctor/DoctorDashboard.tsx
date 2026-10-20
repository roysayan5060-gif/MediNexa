import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  UserPlus,
  PlusCircle,
  CheckCircle2,
  CalendarCheck2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  HeartPulse,
  Activity,
  ShieldCheck,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'clinical' | 'earnings'>('clinical');
  const [stats, setStats] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.hash === '#earnings') {
      setActiveTab('earnings');
    }
  }, [location.hash]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [statsRes, earningsRes] = await Promise.all([
        api.get('/doctors/dashboard'),
        api.get('/doctors/earnings'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data.stats);
        setTodaySchedule(statsRes.data.data.todaySchedule);
        setRecentActivity(statsRes.data.data.recentActivity);
      }
      if (earningsRes.data.success) {
        setEarningsData(earningsRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.message || 'Failed to retrieve real-time clinical statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner message="Querying live clinical & earnings metrics from database..." />;
  }

  const earningsSummary = earningsData?.summary || {
    totalConsultationsCompleted: 0,
    grossPatientFeesPaid: 0,
    clinicShareRetained: 0,
    doctorEarnedTotal: 0,
    payoutsReceived: 0,
    payoutsPending: 0,
    unsettledBalance: 0,
  };

  return (
    <div className="space-y-6">
      {/* High-energy Clinical Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 p-6 md:p-8 text-white shadow-2xl shadow-teal-900/20">
        {/* Glow ornaments */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs font-bold mb-2">
              <Activity className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
              <span>Three-Sided Clinical Node</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs md:text-sm text-teal-100/90 mt-1 max-w-xl">
              You have <span className="font-extrabold text-cyan-200 underline decoration-cyan-300 underline-offset-2">{stats?.todayAppointments || 0} appointment(s)</span> scheduled for today. All records synchronize with your clinic database.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/doctor/patients?new=true')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold backdrop-blur-md transition border border-white/20 shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-cyan-300" /> Register Patient
            </button>
            <button
              onClick={() => navigate('/doctor/appointments?new=true')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold backdrop-blur-md transition border border-white/20 shadow-xs"
            >
              <CalendarCheck2 className="w-4 h-4 text-cyan-300" /> Book Visit
            </button>
            <button
              onClick={() => navigate('/doctor/prescriptions/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 text-teal-950 rounded-2xl text-xs font-black shadow-lg shadow-cyan-500/25 transition transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4 text-teal-950" /> Issue Prescription
            </button>
            <button
              onClick={() => navigate('/doctor/whatsapp-prescriptions')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-950/30 transition transform hover:-translate-y-0.5"
            >
              <MessageSquare className="w-4 h-4 text-white" /> WhatsApp Rx
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Clinical Workspace vs Earnings & Settlements */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('clinical')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 ${
            activeTab === 'clinical'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Clinical Workspace
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 ${
            activeTab === 'earnings'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Coins className="w-3.5 h-3.5" /> Doctor Earnings & Settlements
        </button>
      </div>

      {/* VIEW 1: CLINICAL WORKSPACE */}
      {activeTab === 'clinical' && (
        <div className="space-y-6">
          {/* 5 Distinct Live MongoDB Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Patients</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalPatients || 0}</p>
              <span className="text-[10px] text-teal-600 font-semibold">Under your care</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Visits</span>
              <p className="text-2xl font-black text-teal-700 mt-1">{stats?.todayAppointments || 0}</p>
              <span className="text-[10px] text-teal-600 font-semibold">Live clinic schedule</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Upcoming Visits</span>
              <p className="text-2xl font-black text-cyan-700 mt-1">{stats?.upcomingAppointments || 0}</p>
              <span className="text-[10px] text-cyan-600 font-semibold">Next 30 days</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Follow-ups Due</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats?.followUpsDue || 0}</p>
              <span className="text-[10px] text-amber-600 font-semibold">Care continuity</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Reviews</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">{stats?.pendingReportReviews || 0}</p>
              <span className="text-[10px] text-indigo-600 font-semibold">Lab reports & diagnostics</span>
            </div>
          </div>

          {/* Today's Schedule and Clinical Workflow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Today's Consultation Schedule</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time consultation flow from clinic queue</p>
                </div>
                <button
                  onClick={() => navigate('/doctor/appointments')}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition"
                >
                  Full Calendar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {todaySchedule.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No appointments scheduled for today</p>
                  <p className="text-xs text-slate-400 mt-1">New patient bookings will appear here automatically.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedule.map((appt) => (
                    <div
                      key={appt._id}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-100/90 hover:border-teal-300 hover:bg-teal-50/20 transition duration-150 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 text-center py-1 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200/70">
                          <span className="block text-xs font-black text-teal-800">{appt.startTime}</span>
                          <span className="text-[10px] text-teal-600 font-bold uppercase">{appt.endTime}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {appt.patientId?.firstName} {appt.patientId?.lastName}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/50">
                              {appt.patientId?.patientId}
                            </span>
                            <Badge variant={appt.type === 'teleconsultation' ? 'purple' : 'info'}>
                              {appt.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{appt.reason || 'General Consultation'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={appt.status === 'confirmed' ? 'brand' : appt.status === 'completed' ? 'success' : 'neutral'}>
                          {appt.status}
                        </Badge>
                        <button
                          onClick={() => navigate(`/doctor/prescriptions/new?patientId=${appt.patientId?._id}`)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-100/70 hover:bg-teal-200 transition shadow-xs"
                        >
                          Write Rx
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Recent Activity */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Prescriptions</h3>
                    <p className="text-xs text-slate-400">Authenticated clinician Rx orders</p>
                  </div>
                  <span className="text-base">💊</span>
                </div>

                <div className="space-y-3">
                  {recentActivity?.prescriptions?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No recent prescriptions issued.</p>
                  ) : (
                    recentActivity?.prescriptions?.map((rx: any) => (
                      <div
                        key={rx._id}
                        onClick={() => navigate(`/doctor/patients/${rx.patientId?._id}`)}
                        className="p-3.5 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 cursor-pointer transition flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                            {rx.patientId?.firstName} {rx.patientId?.lastName}
                          </p>
                          <p className="text-[11px] text-teal-700 font-semibold">{rx.prescriptionId} • {rx.items?.length} item(s)</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(rx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* EHR Registry Shortcut */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 text-white shadow-xl shadow-teal-950/20">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-teal-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" /> Longitudinal EHR
                </div>
                <h3 className="text-base font-black">Patient Clinical Registry</h3>
                <p className="text-xs text-slate-300 mt-1 mb-5 leading-relaxed">
                  Access medical histories, allergies, SOAP encounters, and vitals.
                </p>
                <button
                  onClick={() => navigate('/doctor/patients')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-teal-950 font-black text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  Browse Patient Directory <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DOCTOR EARNINGS & SETTLEMENTS */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Consultations</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{earningsSummary.totalConsultationsCompleted}</p>
              <span className="text-[11px] text-teal-600 font-medium">Paid by patients to clinic</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Doctor Earnings</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">₹{earningsSummary.doctorEarnedTotal}</p>
              <span className="text-[11px] text-indigo-600 font-medium">Agreed consultation share</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payouts Settled</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{earningsSummary.payoutsReceived}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Received via UTR transfer</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Clinic Payout</span>
              <p className="text-2xl font-black text-amber-700 mt-1">₹{earningsSummary.payoutsPending || earningsSummary.unsettledBalance}</p>
              <span className="text-[11px] text-amber-600 font-medium">Awaiting clinic batch transfer</span>
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Clinic Payouts & Settlement History</h3>
              <p className="text-xs text-slate-500">
                Authorized payments transferred from the clinic to your account with bank UTR reference numbers
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Settlement ID</th>
                    <th className="py-3 px-4">Clinic</th>
                    <th className="py-3 px-4">Patient Paid</th>
                    <th className="py-3 px-4">Your Cut</th>
                    <th className="py-3 px-4">Bank Ref (UTR)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Settled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earningsData?.settlements?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No settlements processed yet. Unsettled consultation fees will be batched by clinic admin.
                      </td>
                    </tr>
                  ) : (
                    earningsData?.settlements?.map((s: any) => (
                      <tr key={s._id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                        <td className="py-3 px-4 font-bold text-indigo-900">{s.settlementId}</td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-800">
                          {s.clinicId?.name || 'Clinic Standard'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">₹{s.totalPatientPaidInr}</td>
                        <td className="py-3 px-4 font-bold text-emerald-800 text-xs">
                          ₹{s.netPayableInr} ({s.doctorSharePercentage}%)
                        </td>
                        <td className="py-3 px-4 text-teal-800 font-bold">
                          {s.paymentReference || <span className="text-amber-600 font-sans italic font-normal">Pending Bank Transfer</span>}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <Badge variant={s.status === 'paid' ? 'success' : s.status === 'approved' ? 'primary' : 'warning'}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-sans">
                          {s.paidAt ? new Date(s.paidAt).toLocaleDateString() : 'Pending'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Consultation Fee Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Recent Completed Consultations & Fee Splits</h3>
              <p className="text-xs text-slate-500">
                Detailed audit of patient payments received by the clinic and your calculated share
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Patient Name</th>
                    <th className="py-3 px-4">Gross Paid</th>
                    <th className="py-3 px-4">Doctor's Share (70%)</th>
                    <th className="py-3 px-4">Clinic Cut (30%)</th>
                    <th className="py-3 px-4">Settlement Status</th>
                    <th className="py-3 px-4">Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earningsData?.recentConsultations?.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                      <td className="py-3 px-4 font-bold text-amber-800">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {inv.patientId?.firstName} {inv.patientId?.lastName}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">₹{inv.totalAmount}</td>
                      <td className="py-3 px-4 font-bold text-emerald-800">
                        ₹{inv.doctorShareAmount || Math.round(inv.totalAmount * 0.7)}
                      </td>
                      <td className="py-3 px-4 text-teal-800 font-semibold">
                        ₹{inv.clinicShareAmount || Math.round(inv.totalAmount * 0.3)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant={inv.settlementStatus === 'settled' ? 'success' : 'warning'}>
                          {inv.settlementStatus || 'unsettled'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-sans">
                        {new Date(inv.paymentDate || inv.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
