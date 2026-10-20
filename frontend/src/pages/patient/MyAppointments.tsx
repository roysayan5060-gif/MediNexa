import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Appointment } from '../../types';
import { Calendar, Clock, MapPin, XCircle, Plus, Stethoscope } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/appointments');
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load patient appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.patch(`/appointments/${id}/status`, {
        status: 'cancelled',
        cancellationReason: 'Cancelled by patient',
      });
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading your appointments schedule..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Appointments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View upcoming and past consultations with healthcare providers
          </p>
        </div>

        <button
          onClick={() => navigate('/patient/doctors')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Book New Consultation
        </button>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Appointments Scheduled"
          description="You do not have any active appointments. Browse our physician directory to book a visit."
          actionText="Find a Doctor"
          onAction={() => navigate('/patient/doctors')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => (
            <div
              key={apt._id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-700">{apt.appointmentId}</span>
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
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Dr. {apt.doctorId?.name}</h3>
                  <span className="text-xs font-semibold text-teal-700 block">{apt.doctorId?.specialty}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.startTime} - {apt.endTime}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] pl-5.5">
                    Reason: <span className="text-slate-700 font-medium">{apt.reason}</span>
                  </p>
                </div>
              </div>

              {apt.status === 'confirmed' && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleCancelAppointment(apt.appointmentId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel Appointment
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
