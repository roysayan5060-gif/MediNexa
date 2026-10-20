import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Appointment } from '../../types';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarCheck2,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export const DoctorAppointments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(searchParams.get('new') === 'true');
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [bookForm, setBookForm] = useState({
    patientId: '',
    doctorId: user?.role === 'doctor' ? user?.doctorId || '' : '',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '10:30',
    type: 'in-person',
    reason: 'Clinical Follow-up & Review',
  });
  const [bookError, setBookError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      let url = `/appointments?status=${statusFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  // Load patients and doctors for modal dropdown
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [patRes, docRes] = await Promise.all([
          api.get('/patients?limit=50'),
          api.get('/doctors'),
        ]);
        if (patRes.data.success) setPatients(patRes.data.data);
        if (docRes.data.success) {
          setDoctors(docRes.data.data);
          if (!bookForm.doctorId && docRes.data.data.length > 0) {
            setBookForm((prev) => ({ ...prev, doctorId: docRes.data.data[0]._id }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDropdownData();
  }, []);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.appointmentId === appointmentId || a._id === appointmentId ? { ...a, status: newStatus as any } : a))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookError(null);
    setIsBooking(true);

    try {
      const res = await api.post('/appointments', {
        ...bookForm,
        appointmentDate: `${bookForm.appointmentDate}T00:00:00.000Z`,
      });

      if (res.data.success) {
        setIsBookModalOpen(false);
        fetchAppointments();
      }
    } catch (err: any) {
      setBookError(err.response?.data?.message || 'Booking conflict or invalid slot selection.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Appointment Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time schedule queue with automated conflict prevention
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Book Consultation
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Status:
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            {['all', 'confirmed', 'requested', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize transition ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1 text-xs focus:border-teal-500 focus:outline-none"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <LoadingSpinner message="Checking schedule availability and appointments..." />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No appointments found"
          description="There are no appointments matching the selected filter criteria."
          actionText="Book New Appointment"
          onAction={() => setIsBookModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {apt.appointmentId}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block text-sm">
                        {apt.patientId?.firstName} {apt.patientId?.lastName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {apt.patientId?.phone || apt.patientId?.patientId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {apt.doctorId?.name}
                      </span>
                      <span className="text-[11px] text-teal-600">{apt.doctorId?.specialty}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        {apt.startTime} - {apt.endTime}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(apt.appointmentDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize text-slate-600">{apt.type}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          apt.status === 'confirmed'
                            ? 'brand'
                            : apt.status === 'completed'
                            ? 'success'
                            : apt.status === 'cancelled'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {apt.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(apt.appointmentId, 'completed')}
                              title="Mark as Completed"
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(apt.appointmentId, 'cancelled')}
                              title="Cancel Appointment"
                              className="p-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Appointment"
        subtitle="Automatic conflict detection ensures no doctor double-bookings"
        maxWidth="lg"
      >
        {bookError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {bookError}
          </div>
        )}

        <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Patient *</label>
            <select
              required
              value={bookForm.patientId}
              onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2 focus:border-teal-500 focus:outline-none"
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName} ({p.patientId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Physician *</label>
            <select
              required
              value={bookForm.doctorId}
              onChange={(e) => setBookForm({ ...bookForm, doctorId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2 focus:border-teal-500 focus:outline-none"
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={bookForm.appointmentDate}
                onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Time *</label>
              <input
                type="text"
                required
                placeholder="10:00"
                value={bookForm.startTime}
                onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Time *</label>
              <input
                type="text"
                required
                placeholder="10:30"
                value={bookForm.endTime}
                onChange={(e) => setBookForm({ ...bookForm, endTime: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Visit Type</label>
              <select
                value={bookForm.type}
                onChange={(e) => setBookForm({ ...bookForm, type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2"
              >
                <option value="in-person">In-Person Consultation</option>
                <option value="teleconsultation">Teleconsultation</option>
                <option value="follow-up">Follow-up Visit</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Visit</label>
              <input
                type="text"
                value={bookForm.reason}
                onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                placeholder="Chief symptom or checkup"
                className="w-full rounded-xl border border-slate-200 p-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBooking}
              className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              {isBooking ? 'Checking Slot...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
