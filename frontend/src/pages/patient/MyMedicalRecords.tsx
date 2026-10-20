import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  AlertTriangle,
  Heart,
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const MyMedicalRecords: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true);
        if (user?.patientId) {
          const [patRes, encRes] = await Promise.all([
            api.get(`/patients/${user.patientId}`),
            api.get('/encounters'),
          ]);
          if (patRes.data.success) setProfile(patRes.data.data.patient);
          if (encRes.data.success) setEncounters(encRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load records:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner message="Retrieving your authorized medical chart..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Electronic Medical Records (EMR)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your personal medical history, verified diagnoses, and vital records
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Allergies & Conditions */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4" /> Allergies
            </h3>
            {profile?.allergies?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.allergies.map((a: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-100"
                  >
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No known allergies on record.</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 mb-2">
              <Heart className="w-4 h-4" /> Chronic Conditions
            </h3>
            {profile?.chronicConditions?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.chronicConditions.map((c: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-semibold text-xs border border-amber-100"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No chronic health conditions listed.</p>
            )}
          </div>
        </div>

        {/* History Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs md:col-span-2 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Clinical History Summary
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {profile?.medicalHistory || 'No baseline historical summary recorded.'}
          </p>
        </div>
      </div>

      {/* Consultations and SOAP Encounters */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Physician Consultations & Encounter Notes</h3>

        {encounters.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-10 bg-white rounded-3xl border border-slate-100">
            No clinical consultation summaries on record.
          </p>
        ) : (
          encounters.map((enc) => (
            <div key={enc._id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Dr. {enc.doctorId?.name}</h4>
                  <span className="text-[11px] text-teal-600 font-semibold">{enc.doctorId?.specialty}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(enc.encounterDate).toLocaleDateString()}
                </span>
              </div>

              {enc.vitals && (
                <div className="flex flex-wrap gap-4 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span><strong>BP:</strong> {enc.vitals.bloodPressure || 'N/A'}</span>
                  <span><strong>Pulse:</strong> {enc.vitals.heartRate ? `${enc.vitals.heartRate} bpm` : 'N/A'}</span>
                  <span><strong>Temp:</strong> {enc.vitals.temperature ? `${enc.vitals.temperature} °F` : 'N/A'}</span>
                  <span><strong>Weight:</strong> {enc.vitals.weightKg ? `${enc.vitals.weightKg} kg` : 'N/A'}</span>
                </div>
              )}

              <div className="text-xs space-y-1.5 pt-1">
                <p>
                  <strong className="text-slate-800">Diagnosis:</strong>{' '}
                  <span className="font-bold text-teal-800">{enc.diagnosis}</span>
                </p>
                {enc.clinicalNotes && (
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Physician Advice:</strong> {enc.clinicalNotes}
                  </p>
                )}
                {enc.followUpPlan && (
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Follow-up:</strong> {enc.followUpPlan}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
