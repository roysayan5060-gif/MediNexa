import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Users,
  Calendar,
  Receipt,
  CreditCard,
  CheckCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  Stethoscope,
  Filter,
  CheckCircle2,
  RefreshCw,
  Printer,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export const ClinicDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'doctors' | 'payments' | 'settlements' | 'ledger' | 'refunds' | 'profile'
  >('overview');

  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [clinicDoctors, setClinicDoctors] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);

  // Modals
  const [isQuickCollectOpen, setIsQuickCollectOpen] = useState(false);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [settlementPreview, setSettlementPreview] = useState<any[]>([]);

  // Forms
  const [posForm, setPosForm] = useState({
    patientId: '',
    doctorId: '',
    amount: 500,
    serviceDescription: 'Walk-in Consultation & Clinical Evaluation',
    paymentMethod: 'cash',
  });

  const [doctorScheduleForm, setDoctorScheduleForm] = useState({
    doctorId: '',
    consultationFee: 500,
    doctorSharePercentage: 70,
    startTime: '10:00',
    endTime: '13:00',
    selectedDays: [1, 2, 3, 4, 5],
  });

  const [settlementPayForm, setSettlementPayForm] = useState({
    settlementId: '',
    paymentReference: '',
    paymentMode: 'manual_bank_transfer',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    doctorId: '',
    description: 'Consultation & Diagnostics',
    unitPrice: 500,
    quantity: 1,
  });

  const [clinicProfileForm, setClinicProfileForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    defaultDoctorSharePercentage: 70,
    bankDetails: {
      accountName: '',
      accountNumber: '',
      ifsc: '',
      bankName: '',
    },
  });

  const fetchAllClinicData = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, docRes, allDocsRes, invRes, setRes, ledgRes, patRes] =
        await Promise.all([
          api.get('/clinics/current/dashboard-overview'),
          api.get('/clinics/current/doctors'),
          api.get('/doctors'),
          api.get('/invoices'),
          api.get('/clinics/current/settlements'),
          api.get('/clinics/current/financial-ledger'),
          api.get('/patients?limit=100'),
        ]);

      if (overviewRes.data.success) {
        setOverviewData(overviewRes.data.data);
        if (overviewRes.data.data.clinic) {
          const c = overviewRes.data.data.clinic;
          setClinicProfileForm({
            name: c.name || '',
            address: c.address || '',
            city: c.city || '',
            state: c.state || '',
            phone: c.phone || '',
            defaultDoctorSharePercentage: c.defaultDoctorSharePercentage || 70,
            bankDetails: c.bankDetails || {
              accountName: '',
              accountNumber: '',
              ifsc: '',
              bankName: '',
            },
          });
        }
      }
      if (docRes.data.success) setClinicDoctors(docRes.data.data);
      if (allDocsRes.data.success) setAllDoctors(allDocsRes.data.data);
      if (invRes.data.success) setInvoices(invRes.data.data);
      if (setRes.data.success) setSettlements(setRes.data.data);
      if (ledgRes.data.success) setLedgerData(ledgRes.data.data);
      if (patRes.data.success) setPatients(patRes.data.data);
    } catch (err) {
      console.error('Failed to load clinic data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllClinicData();
  }, []);

  // Quick Counter POS Collection
  const handleQuickCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/invoices/quick-collect', posForm);
      if (res.data.success) {
        alert(`Counter POS payment of ₹${posForm.amount} collected successfully!`);
        setIsQuickCollectOpen(false);
        fetchAllClinicData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Quick collect failed');
    }
  };

  // Add / Configure Doctor Schedule
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const workingHours = doctorScheduleForm.selectedDays.map((day) => ({
        dayOfWeek: day,
        startTime: doctorScheduleForm.startTime,
        endTime: doctorScheduleForm.endTime,
        slotDurationMinutes: 30,
        isAvailable: true,
      }));

      const res = await api.post('/clinics/current/doctors', {
        doctorId: doctorScheduleForm.doctorId,
        consultationFee: doctorScheduleForm.consultationFee,
        doctorSharePercentage: doctorScheduleForm.doctorSharePercentage,
        workingHours,
      });

      if (res.data.success) {
        alert('Doctor schedule and fee split configured successfully!');
        setIsAddDoctorOpen(false);
        fetchAllClinicData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to configure doctor schedule');
    }
  };

  // Preview settlements before batch creation
  const handleOpenSettlementsModal = async () => {
    try {
      const res = await api.post('/clinics/current/settlements/preview', {});
      if (res.data.success) {
        setSettlementPreview(res.data.data);
        setIsSettlementModalOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to preview settlements');
    }
  };

  // Approve settlement batch
  const handleCreateSettlementBatch = async (doctorId: string, invoiceIds: string[]) => {
    try {
      const res = await api.post('/clinics/current/settlements/create-batch', {
        doctorId,
        invoiceIds,
        notes: 'Clinical consultation payout batch approved by clinic admin',
      });
      if (res.data.success) {
        alert(`Settlement batch created: ${res.data.message}`);
        setIsSettlementModalOpen(false);
        fetchAllClinicData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve settlement batch');
    }
  };

  // Mark Settlement as Paid (Recording UTR reference)
  const handleMarkSettlementPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post(
        `/clinics/current/settlements/${settlementPayForm.settlementId}/pay`,
        {
          paymentReference: settlementPayForm.paymentReference || `UTR-${Date.now().toString().slice(-8)}`,
          paymentMode: settlementPayForm.paymentMode,
        }
      );
      if (res.data.success) {
        alert('Doctor settlement marked as PAID and debited from financial ledger!');
        setSettlementPayForm({ settlementId: '', paymentReference: '', paymentMode: 'manual_bank_transfer' });
        fetchAllClinicData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record settlement payment');
    }
  };

  // Process Refund
  const handleRefund = async (invoiceNumber: string) => {
    const reason = prompt('Please enter the cancellation/refund reason:', 'Patient cancelled consultation');
    if (!reason) return;

    try {
      const res = await api.post(`/invoices/${invoiceNumber}/refund`, {
        refundReason: reason,
      });
      if (res.data.success) {
        alert('Refund processed successfully. Ledger reversal entry recorded.');
        fetchAllClinicData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Refund failed');
    }
  };

  // Update Clinic Profile & Bank Settings
  const handleUpdateClinicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/clinics/current', clinicProfileForm);
      if (res.data.success) {
        alert('Clinic settings and bank details updated successfully!');
        fetchAllClinicData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update clinic profile');
    }
  };

  // CSV Export for Financial Ledger
  const handleExportCSV = () => {
    if (!ledgerData?.entries || ledgerData.entries.length === 0) {
      alert('No financial ledger entries to export');
      return;
    }

    const headers = ['Entry ID', 'Type', 'Direction', 'Amount (INR)', 'Status', 'Description', 'Method', 'Date'];
    const rows = ledgerData.entries.map((e: any) => [
      e.entryId,
      e.type,
      e.direction,
      e.amountInr,
      e.status,
      `"${e.description.replace(/"/g, '""')}"`,
      e.paymentMethod || 'N/A',
      new Date(e.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Clinic_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading Clinic Operations Center & Ledger..." />;
  }

  const metrics = overviewData?.metrics || {
    todayAppointments: 0,
    completedConsultations: 0,
    pendingAppointments: 0,
    totalPatientPaymentsReceived: 0,
    paymentsAwaitingConfirmation: 0,
    doctorSettlementsPendingTotal: 0,
    doctorSettlementsCompletedTotal: 0,
    refundsTotal: 0,
    availableClinicBalance: 0,
  };

  const clinic = overviewData?.clinic;

  return (
    <div className="space-y-6">
      {/* Clinic Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 p-6 text-white shadow-xl shadow-teal-900/15">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 shadow-xs">
                🏥 Central Clinic Node
              </span>
              <span className="text-xs text-teal-200 font-mono font-bold">
                Code: {clinic?.code || 'APEX-01'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {clinic?.name || 'Apex Multispecialty Hospital & Clinic'}
            </h1>
            <p className="text-xs text-teal-100/90 mt-1 max-w-2xl">
              {clinic?.address}, {clinic?.city}, {clinic?.state} • Phone: {clinic?.phone}
            </p>
          </div>

          {/* Quick Counter POS and Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsQuickCollectOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/30 transition transform hover:-translate-y-0.5"
            >
              <CreditCard className="w-4 h-4" /> Collect POS Payment
            </button>
            <button
              onClick={() => setIsAddDoctorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md transition border border-white/20"
            >
              <Plus className="w-4 h-4" /> Add Doctor
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-teal-100 bg-white/10 hover:bg-white/20 backdrop-blur-md transition border border-white/20"
            >
              <Download className="w-4 h-4" /> CSV Export
            </button>
          </div>
        </div>
      </div>

      {/* Live Financial & Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Today's Appointments */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Appointments</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.todayAppointments}</p>
          <span className="text-[10px] text-teal-600 font-semibold">{metrics.completedConsultations} Completed</span>
        </div>

        {/* Patient Collections */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Patient Payments</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">₹{metrics.totalPatientPaymentsReceived}</p>
          <span className="text-[10px] text-amber-600 font-semibold">₹{metrics.paymentsAwaitingConfirmation} Pending</span>
        </div>

        {/* Doctor Settlements Pending */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Doctor Settlements</span>
          <p className="text-2xl font-black text-amber-700 mt-1">₹{metrics.doctorSettlementsPendingTotal}</p>
          <span className="text-[10px] text-slate-500 font-semibold">₹{metrics.doctorSettlementsCompletedTotal} Paid</span>
        </div>

        {/* Refunds Issued */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Refunds Issued</span>
          <p className="text-2xl font-black text-rose-700 mt-1">₹{metrics.refundsTotal}</p>
          <span className="text-[10px] text-slate-400 font-semibold">Reversal records logged</span>
        </div>

        {/* Available Balance */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-3xl border border-teal-200/60 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">Clinic Balance</span>
          <p className="text-2xl font-black text-teal-900 mt-1">₹{metrics.availableClinicBalance}</p>
          <span className="text-[10px] text-teal-700 font-bold">Auditable Net Reserve</span>
        </div>
      </div>

      {/* Multi-Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-2 py-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'overview'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Today's Queue & Overview
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'doctors'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Doctors & Schedules ({clinicDoctors.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'payments'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Section A: Incoming Payments ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'settlements'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Section B: Doctor Settlements ({settlements.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'ledger'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Financial Ledger & Wallet
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'refunds'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Refunds & Cancellations
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-xs font-bold rounded-2xl whitespace-nowrap transition ${
            activeTab === 'profile'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Clinic Bank & Settings
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TODAY'S QUEUE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Today's Patient Queue</h3>
                <p className="text-xs text-slate-500">Live reception check-in and consultation queue for today</p>
              </div>
              <button
                onClick={fetchAllClinicData}
                className="p-2 text-slate-400 hover:text-teal-600 rounded-xl hover:bg-slate-100 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {overviewData?.todayQueue && overviewData.todayQueue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Assigned Doctor</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overviewData.todayQueue.map((appt: any) => (
                      <tr key={appt._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-teal-800">
                          {appt.startTime} - {appt.endTime}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {appt.patientId?.firstName} {appt.patientId?.lastName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            ID: {appt.patientId?.patientId} • Phone: {appt.patientId?.phone}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">
                          Dr. {appt.doctorId?.name}
                          <span className="block text-[10px] text-slate-400">
                            {appt.doctorId?.specialty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{appt.reason}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              appt.status === 'completed'
                                ? 'success'
                                : appt.status === 'confirmed'
                                ? 'primary'
                                : 'warning'
                            }
                          >
                            {appt.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setPosForm((prev) => ({
                                ...prev,
                                patientId: appt.patientId?._id,
                                doctorId: appt.doctorId?._id,
                              }));
                              setIsQuickCollectOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition"
                          >
                            Collect ₹
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No appointments scheduled for today"
                description="The walk-in reception counter is ready to register patients or book consultations."
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DOCTORS & SCHEDULE MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Clinic Doctors & Rosters</h3>
              <p className="text-xs text-slate-500">
                Multiple doctors with clinic-specific consultation fees, time slots, and agreed fee allocation (e.g. 70/30)
              </p>
            </div>
            <button
              onClick={() => setIsAddDoctorOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Doctor to Clinic
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Specialty</th>
                  <th className="py-3 px-4">Consultation Fee</th>
                  <th className="py-3 px-4">Split Ratio</th>
                  <th className="py-3 px-4">Available Timings</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinicDoctors.map((m: any) => {
                  const doc = m.doctorId || {};
                  return (
                    <tr key={m._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {doc.title || 'Dr.'} {doc.name}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Reg: {doc.registrationNumber || 'N/A'} • {doc.phone}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-teal-800 font-semibold">{doc.specialty}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        ₹{m.consultationFee || doc.consultationFee || 500}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-700">
                        {m.doctorSharePercentage}% Doc / {100 - m.doctorSharePercentage}% Clinic
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.workingHours && m.workingHours.length > 0 ? (
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {m.workingHours[0].startTime} - {m.workingHours[0].endTime}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Mon–Fri ({m.appointmentDurationMinutes || 30} mins/slot)
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Universal default schedule</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={m.isActive ? 'success' : 'default'}>
                          {m.isActive ? 'Active Staff' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setDoctorScheduleForm({
                              doctorId: doc._id,
                              consultationFee: m.consultationFee,
                              doctorSharePercentage: m.doctorSharePercentage,
                              startTime: m.workingHours?.[0]?.startTime || '10:00',
                              endTime: m.workingHours?.[0]?.endTime || '13:00',
                              selectedDays: [1, 2, 3, 4, 5],
                            });
                            setIsAddDoctorOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition"
                        >
                          Configure Schedule
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SECTION A — INCOMING PATIENT PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Section A: Money Received from Patients</h3>
              <p className="text-xs text-slate-500">
                The clinic is the recipient of patient payments. Tracks gross amounts, doctor liabilities, and gateway charges.
              </p>
            </div>
            <button
              onClick={() => setIsQuickCollectOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition"
            >
              <CreditCard className="w-3.5 h-3.5" /> Quick Collect POS
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Doctor Share</th>
                  <th className="py-3 px-4">Clinic Share</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-amber-800">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.paymentDate || inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {inv.patientId?.firstName} {inv.patientId?.lastName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{inv.doctorId?.name || 'Clinic Standard'}</td>
                    <td className="py-3 px-4 font-bold text-emerald-800 font-mono">₹{inv.totalAmount}</td>
                    <td className="py-3 px-4 font-semibold text-indigo-700 font-mono">
                      ₹{inv.doctorShareAmount || Math.round(inv.totalAmount * 0.7)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-teal-700 font-mono">
                      ₹{inv.clinicShareAmount || Math.round(inv.totalAmount * 0.3)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                          {inv.paymentMethod?.replace('_test', '')}
                        </span>
                        {inv.isDemo ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold whitespace-nowrap">
                            Demo Sandbox
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold whitespace-nowrap">
                            Razorpay Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          inv.status === 'paid' ? 'success' : inv.status === 'refunded' ? 'danger' : 'warning'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingReceipt(inv)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition"
                        >
                          Voucher
                        </button>
                        {inv.status === 'paid' && (
                          <button
                            onClick={() => handleRefund(inv.invoiceNumber)}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SECTION B — DOCTOR SETTLEMENTS */}
      {activeTab === 'settlements' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Section B: Money Paid to Doctors (Settlements)</h3>
              <p className="text-xs text-slate-500">
                Calculates the doctor's agreed share (e.g. 70%) vs clinic retained cut (30%), batch approval, and UTR recording
              </p>
            </div>
            <button
              onClick={handleOpenSettlementsModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
            >
              <Coins className="w-4 h-4" /> Calculate & Settle Payouts
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Settlement ID</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Total Patient Paid</th>
                  <th className="py-3 px-4">Doctor's Agreed Share</th>
                  <th className="py-3 px-4">Clinic Retained</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Payment Ref (UTR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map((s: any) => (
                  <tr key={s._id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-900">{s.settlementId}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Dr. {s.doctorId?.name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {s.doctorId?.specialty}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">₹{s.totalPatientPaidInr}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      ₹{s.doctorShareInr} ({s.doctorSharePercentage}%)
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">₹{s.clinicShareInr}</td>
                    <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                      ₹{s.netPayableInr}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {s.paymentReference || <span className="text-amber-600 font-sans italic">Pending Payout</span>}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={s.status === 'paid' ? 'success' : s.status === 'approved' ? 'primary' : 'warning'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {s.status !== 'paid' ? (
                        <button
                          onClick={() => {
                            setSettlementPayForm({
                              settlementId: s.settlementId,
                              paymentReference: `UTR-HDFC-${Date.now().toString().slice(-6)}`,
                              paymentMode: 'manual_bank_transfer',
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                        >
                          Record UTR Payout
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline UTR Recording Box if selected */}
          {settlementPayForm.settlementId && (
            <form
              onSubmit={handleMarkSettlementPaid}
              className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center gap-3 text-xs"
            >
              <div className="flex-1">
                <span className="font-bold text-emerald-950 block">
                  Confirm Payout for Settlement {settlementPayForm.settlementId}:
                </span>
                <span className="text-emerald-800 text-[11px]">
                  Provide the bank transfer UTR or NEFT reference. This will write an immutable debit entry into the financial ledger.
                </span>
              </div>
              <input
                type="text"
                required
                value={settlementPayForm.paymentReference}
                onChange={(e) =>
                  setSettlementPayForm({ ...settlementPayForm, paymentReference: e.target.value })
                }
                placeholder="UTR / Bank Ref Number"
                className="rounded-xl border border-emerald-300 p-2 font-mono text-xs w-full sm:w-56 bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl"
                >
                  Confirm Payout
                </button>
                <button
                  type="button"
                  onClick={() => setSettlementPayForm({ settlementId: '', paymentReference: '', paymentMode: 'manual_bank_transfer' })}
                  className="px-3 py-2 font-semibold text-slate-600 hover:bg-emerald-100 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 5: FINANCIAL LEDGER & WALLET */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Auditable Clinic Financial Ledger</h3>
              <p className="text-xs text-slate-500">
                Immutable double-entry ledger stored with integer paise for INR compliance. Corrections use explicit reversal records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold">
                Net Reserve: ₹{ledgerData?.summary?.currentBalanceInr || 0}
              </span>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Entry ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Amount (Paise)</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData?.entries?.map((e: any) => (
                  <tr key={e._id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                    <td className="py-3 px-4 font-bold text-slate-800">{e.entryId}</td>
                    <td className="py-3 px-4 font-sans capitalize font-bold text-slate-700">
                      {e.type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {e.direction === 'credit' ? (
                        <span className="text-emerald-700 flex items-center gap-0.5">
                          <ArrowDownLeft className="w-3 h-3" /> Credit
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" /> Debit
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 font-bold text-xs ${e.direction === 'credit' ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {e.direction === 'credit' ? '+' : '-'}₹{e.amountInr}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{e.amountPaise}p</td>
                    <td className="py-3 px-4 text-teal-800 font-bold">{e.referenceId || 'N/A'}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">{e.description}</td>
                    <td className="py-3 px-4 font-sans">
                      <Badge variant={e.status === 'cleared' || e.status === 'settled' ? 'success' : 'warning'}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: REFUNDS & CANCELLATIONS */}
      {activeTab === 'refunds' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Cancellations & Refunds</h3>
            <p className="text-xs text-slate-500">
              When an appointment is cancelled, refunds are calculated and recorded as debit reversal entries in the financial ledger.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Refund Ref</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Refund Amount</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices
                  .filter((inv) => inv.status === 'refunded')
                  .map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-rose-800">{inv.refundRef || 'REF-DEMO'}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {inv.patientId?.firstName} {inv.patientId?.lastName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{inv.doctorId?.name || 'Clinic Standard'}</td>
                      <td className="py-3 px-4 font-mono font-black text-rose-700">₹{inv.refundAmount || inv.totalAmount}</td>
                      <td className="py-3 px-4 text-slate-600">{inv.refundReason || 'Appointment cancelled'}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.refundDate || inv.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="danger">Refunded</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CLINIC PROFILE & BANK SETTINGS */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-black text-slate-900">Clinic Profile & Settlement Bank Account</h3>
            <p className="text-xs text-slate-500">
              Configure clinic address, phone, default doctor fee split, and commercial bank account for payout settlements
            </p>
          </div>

          <form onSubmit={handleUpdateClinicProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinic Name</label>
                <input
                  type="text"
                  required
                  value={clinicProfileForm.name}
                  onChange={(e) => setClinicProfileForm({ ...clinicProfileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={clinicProfileForm.phone}
                  onChange={(e) => setClinicProfileForm({ ...clinicProfileForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={clinicProfileForm.address}
                  onChange={(e) => setClinicProfileForm({ ...clinicProfileForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={clinicProfileForm.city}
                  onChange={(e) => setClinicProfileForm({ ...clinicProfileForm, city: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  required
                  value={clinicProfileForm.state}
                  onChange={(e) => setClinicProfileForm({ ...clinicProfileForm, state: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Doctor Split (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={clinicProfileForm.defaultDoctorSharePercentage}
                  onChange={(e) =>
                    setClinicProfileForm({
                      ...clinicProfileForm,
                      defaultDoctorSharePercentage: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </div>

            {/* Bank Details Sub-card */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600" /> Commercial Bank Details (For Indian Gateway Settlements)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Beneficiary Account Name</label>
                  <input
                    type="text"
                    value={clinicProfileForm.bankDetails.accountName}
                    onChange={(e) =>
                      setClinicProfileForm({
                        ...clinicProfileForm,
                        bankDetails: { ...clinicProfileForm.bankDetails, accountName: e.target.value },
                      })
                    }
                    placeholder="Apex Multispecialty Trust"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={clinicProfileForm.bankDetails.bankName}
                    onChange={(e) =>
                      setClinicProfileForm({
                        ...clinicProfileForm,
                        bankDetails: { ...clinicProfileForm.bankDetails, bankName: e.target.value },
                      })
                    }
                    placeholder="HDFC Bank Ltd"
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={clinicProfileForm.bankDetails.accountNumber}
                    onChange={(e) =>
                      setClinicProfileForm({
                        ...clinicProfileForm,
                        bankDetails: { ...clinicProfileForm.bankDetails, accountNumber: e.target.value },
                      })
                    }
                    placeholder="50200088991122"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={clinicProfileForm.bankDetails.ifsc}
                    onChange={(e) =>
                      setClinicProfileForm({
                        ...clinicProfileForm,
                        bankDetails: { ...clinicProfileForm.bankDetails, ifsc: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="HDFC0001234"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition"
            >
              Save Clinic Settings
            </button>
          </form>
        </div>
      )}

      {/* MODAL 1: QUICK COUNTER POS (Walk-in payment) */}
      <Modal
        isOpen={isQuickCollectOpen}
        onClose={() => setIsQuickCollectOpen(false)}
        title="Walk-In Reception POS Terminal"
        subtitle="Collect patient consultation fees directly at the clinic counter"
        maxWidth="md"
      >
        <form onSubmit={handleQuickCollect} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
            <select
              required
              value={posForm.patientId}
              onChange={(e) => setPosForm({ ...posForm, patientId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName} ({p.patientId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Consulting Doctor</label>
            <select
              value={posForm.doctorId}
              onChange={(e) => setPosForm({ ...posForm, doctorId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5"
            >
              <option value="">-- Optional / Clinic General --</option>
              {allDoctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Service / Description</label>
            <input
              type="text"
              required
              value={posForm.serviceDescription}
              onChange={(e) => setPosForm({ ...posForm, serviceDescription: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (₹ INR) *</label>
              <input
                type="number"
                min={1}
                required
                value={posForm.amount}
                onChange={(e) => setPosForm({ ...posForm, amount: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={posForm.paymentMethod}
                onChange={(e) => setPosForm({ ...posForm, paymentMethod: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
              >
                <option value="cash">💵 Cash at Desk</option>
                <option value="upi_test">📱 Counter UPI QR</option>
                <option value="card_test">💳 POS Card Swipe</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 font-semibold flex justify-between items-center">
            <span>Total Collected at Counter:</span>
            <span className="font-mono text-base font-black">₹{posForm.amount}</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickCollectOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs"
            >
              Complete POS Collection
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / CONFIGURE DOCTOR ROSTER */}
      <Modal
        isOpen={isAddDoctorOpen}
        onClose={() => setIsAddDoctorOpen(false)}
        title="Doctor Schedule & Fee Arrangement"
        subtitle="Manage working days, available time slots, and clinic-doctor split arrangement"
        maxWidth="md"
      >
        <form onSubmit={handleAddDoctor} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Physician *</label>
            <select
              required
              value={doctorScheduleForm.doctorId}
              onChange={(e) => setDoctorScheduleForm({ ...doctorScheduleForm, doctorId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5"
            >
              <option value="">-- Choose Doctor --</option>
              {allDoctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Consultation Fee (₹ INR) *</label>
              <input
                type="number"
                min={0}
                required
                value={doctorScheduleForm.consultationFee}
                onChange={(e) =>
                  setDoctorScheduleForm({ ...doctorScheduleForm, consultationFee: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Doctor Split (% to Doctor) *</label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={doctorScheduleForm.doctorSharePercentage}
                onChange={(e) =>
                  setDoctorScheduleForm({
                    ...doctorScheduleForm,
                    doctorSharePercentage: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
              />
              <span className="text-[10px] text-slate-400">
                Clinic retains {100 - doctorScheduleForm.doctorSharePercentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Time (Daily) *</label>
              <input
                type="time"
                required
                value={doctorScheduleForm.startTime}
                onChange={(e) => setDoctorScheduleForm({ ...doctorScheduleForm, startTime: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">End Time (Daily) *</label>
              <input
                type="time"
                required
                value={doctorScheduleForm.endTime}
                onChange={(e) => setDoctorScheduleForm({ ...doctorScheduleForm, endTime: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 text-[11px]">
            <p className="font-bold text-slate-800 mb-1">Example Timing & Split Configuration:</p>
            <p>• Dr. Sarah Jenkins (Cardiology): 10:00 AM – 1:00 PM (70% Doctor / 30% Clinic)</p>
            <p>• Dr. Robert Chen (General Med): 2:00 PM – 5:00 PM (75% Doctor / 25% Clinic)</p>
            <p>• Dr. Priya Patel (Pediatrics): 5:00 PM – 8:00 PM (70% Doctor / 30% Clinic)</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddDoctorOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
            >
              Save Schedule & Agreement
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: SETTLEMENTS CALCULATION PREVIEW */}
      <Modal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        title="Doctor Settlement Queue & Split Calculation"
        subtitle="Review completed patient consultations and calculate agreed fee allocations"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {settlementPreview.length === 0 ? (
            <p className="text-slate-500 py-6 text-center">
              All completed consultations have already been settled or no unsettled payments exist.
            </p>
          ) : (
            settlementPreview.map((group: any) => (
              <div key={group.doctor._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">Dr. {group.doctor.name}</h4>
                    <p className="text-[11px] text-teal-700 font-bold">
                      {group.doctor.specialty} • Agreed Split: {group.splitPercentage}% Doctor / {100 - group.splitPercentage}% Clinic
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCreateSettlementBatch(
                        group.doctor._id,
                        group.invoices.map((i: any) => i.invoiceId)
                      )
                    }
                    className="px-3 py-1.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                  >
                    Approve Batch (₹{group.doctorShareTotal})
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-bold">Gross Paid by Patients</span>
                    <span className="font-black text-slate-900 text-sm">₹{group.totalGrossPaid}</span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block font-bold">Doctor's Share (Payable)</span>
                    <span className="font-black text-emerald-800 text-sm">₹{group.doctorShareTotal}</span>
                  </div>
                  <div className="bg-teal-50 p-2 rounded-xl border border-teal-200">
                    <span className="text-teal-700 block font-bold">Clinic Retained Cut</span>
                    <span className="font-black text-teal-800 text-sm">₹{group.clinicShareTotal}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400">
                  Includes {group.invoices.length} consultation invoice(s):{' '}
                  {group.invoices.map((i: any) => i.invoiceNumber).join(', ')}
                </p>
              </div>
            ))
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsSettlementModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* OFFICIAL RECEIPT / VOUCHER MODAL */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title="Clinical Payment Voucher"
          subtitle={`Invoice Reference: ${viewingReceipt.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="p-4 space-y-4 text-xs bg-slate-50/50 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900">{clinic?.name || 'Doctor X Healthcare'}</h4>
                <p className="text-[11px] text-slate-500">Authorized Clinical Payment Voucher</p>
              </div>
              <Badge variant={viewingReceipt.status === 'paid' ? 'success' : 'danger'}>
                {viewingReceipt.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block font-bold">Patient:</span>
                <span className="font-bold text-slate-800">
                  {viewingReceipt.patientId?.firstName} {viewingReceipt.patientId?.lastName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Doctor:</span>
                <span className="font-bold text-slate-800">{viewingReceipt.doctorId?.name || 'Clinic Standard'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Txn Reference:</span>
                <span className="font-mono font-bold text-teal-800">
                  {viewingReceipt.transactionRef || 'TXN-COUNTER-001'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Payment Method:</span>
                <span className="font-bold text-slate-800 capitalize">
                  {viewingReceipt.paymentMethod?.replace('_test', '')}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center py-2 font-black text-sm">
                <span>Total Amount:</span>
                <span className="text-emerald-700 font-mono">₹{viewingReceipt.totalAmount}</span>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
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
