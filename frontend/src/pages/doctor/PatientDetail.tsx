import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  User,
  ArrowLeft,
  Calendar,
  FileText,
  Activity,
  Heart,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Plus,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { PrescriptionPad } from '../../components/prescription/PrescriptionPad';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'encounters' | 'prescriptions' | 'reminders'>('overview');

  // New Clinical Encounter Modal
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);
  const [encounterForm, setEncounterForm] = useState({
    bpSystolic: '120',
    bpDiastolic: '80',
    heartRate: '72',
    temperature: '98.6',
    weightKg: '65',
    spo2: '99',
    chiefComplaints: '',
    historyOfPresentIllness: '',
    physicalExamination: '',
    diagnosis: '',
    clinicalNotes: '',
    followUpPlan: '',
  });

  const fetchPatientProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/patients/${id}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch patient chart:', err);
      setError(err.response?.data?.message || 'Access Denied: You do not have permission to view this medical record.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientProfile();
  }, [id]);

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        patientId: data?.patient?._id,
        doctorId: data?.patient?.primaryDoctorId?._id || 'me',
        vitals: {
          bloodPressure: `${encounterForm.bpSystolic}/${encounterForm.bpDiastolic}`,
          heartRate: Number(encounterForm.heartRate) || undefined,
          temperature: Number(encounterForm.temperature) || undefined,
          weightKg: Number(encounterForm.weightKg) || undefined,
          spo2: Number(encounterForm.spo2) || undefined,
        },
        chiefComplaints: encounterForm.chiefComplaints,
        historyOfPresentIllness: encounterForm.historyOfPresentIllness,
        physicalExamination: encounterForm.physicalExamination,
        diagnosis: encounterForm.diagnosis,
        clinicalNotes: encounterForm.clinicalNotes,
        followUpPlan: encounterForm.followUpPlan,
      };

      const res = await api.post('/encounters', payload);
      if (res.data.success) {
        setIsEncounterModalOpen(false);
        fetchPatientProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save encounter note');
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Retrieving authorized patient chart and clinical history..." />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-white rounded-3xl border border-rose-100 shadow-lg">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'Unable to open patient record.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const patient = data.patient;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/doctor/patients')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Patient Registry
      </button>

      {/* Patient Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
            {patient.firstName?.charAt(0)}
            {patient.lastName?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {patient.firstName} {patient.lastName}
              </h1>
              <Badge variant={patient.status === 'active' ? 'success' : 'neutral'}>
                {patient.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                {patient.patientId}
              </span>
              <span>•</span>
              <span className="capitalize">{patient.gender}</span>
              <span>•</span>
              <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
              <span>•</span>
              <span className="font-bold text-slate-700">Blood Group: {patient.bloodGroup || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEncounterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition"
          >
            <Activity className="w-4 h-4" /> Add Encounter
          </button>
          <button
            onClick={() => navigate(`/doctor/prescriptions/new?patientId=${patient._id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
          >
            <FileText className="w-4 h-4" /> Prescribe
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Medical Overview
        </button>
        <button
          onClick={() => setActiveTab('encounters')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'encounters'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clinical Encounters ({data.encounters?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'prescriptions'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Prescriptions ({data.prescriptions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'appointments'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Past & Upcoming Visits ({data.appointments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'reminders'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Follow-ups & Reminders ({data.reminders?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Allergies & Chronic Conditions */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" /> Allergies
              </h3>
              {patient.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((allergy: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-100"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No known drug/food allergies recorded.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 mb-2">
                <Heart className="w-4 h-4" /> Chronic Conditions
              </h3>
              {patient.chronicConditions?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions.map((cond: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold text-xs border border-amber-100"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No chronic health conditions listed.</p>
              )}
            </div>
          </div>

          {/* Medical History Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Longitudinal Clinical History
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {patient.medicalHistory || 'No baseline historical summary recorded.'}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Contact Details:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.phone}</p>
                <p className="text-slate-500">{patient.email || 'No email'}</p>
                <p className="text-slate-500 mt-1">{patient.address ? `${patient.address}, ${patient.city || ''} ${patient.state || ''}` : 'No address'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Emergency Contact:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{patient.emergencyContact?.name || 'N/A'}</p>
                <p className="text-slate-500">{patient.emergencyContact?.relationship} • {patient.emergencyContact?.phone}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Encounters */}
      {activeTab === 'encounters' && (
        <div className="space-y-4">
          {data.encounters?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12 bg-white rounded-3xl border border-slate-100">
              No clinical encounters documented yet.
            </p>
          ) : (
            data.encounters.map((enc: any) => (
              <div key={enc._id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-teal-700">{enc.encounterId}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      • {new Date(enc.encounterDate).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="brand">{enc.status}</Badge>
                </div>

                {/* Vitals Ribbon */}
                {enc.vitals && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">BP:</span>
                      <span className="font-bold text-slate-800">{enc.vitals.bloodPressure || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Heart Rate:</span>
                      <span className="font-bold text-slate-800">{enc.vitals.heartRate ? `${enc.vitals.heartRate} bpm` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Temp:</span>
                      <span className="font-bold text-slate-800">{enc.vitals.temperature ? `${enc.vitals.temperature} °F` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Weight:</span>
                      <span className="font-bold text-slate-800">{enc.vitals.weightKg ? `${enc.vitals.weightKg} kg` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SpO2:</span>
                      <span className="font-bold text-slate-800">{enc.vitals.spo2 ? `${enc.vitals.spo2} %` : 'N/A'}</span>
                    </div>
                  </div>
                )}

                <div className="text-xs space-y-2">
                  <div>
                    <span className="font-bold text-slate-700">Chief Complaints: </span>
                    <span className="text-slate-800">{enc.chiefComplaints}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Diagnosis: </span>
                    <span className="font-bold text-teal-800">{enc.diagnosis}</span>
                  </div>
                  {enc.clinicalNotes && (
                    <div>
                      <span className="font-bold text-slate-700">Clinical Notes: </span>
                      <span className="text-slate-600">{enc.clinicalNotes}</span>
                    </div>
                  )}
                  {enc.followUpPlan && (
                    <div>
                      <span className="font-bold text-slate-700">Follow-up Plan: </span>
                      <span className="text-slate-600">{enc.followUpPlan}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          {data.prescriptions?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12 bg-white rounded-3xl border border-slate-100">
              No prescriptions recorded for this patient.
            </p>
          ) : (
            data.prescriptions.map((rx: any) => (
              <PrescriptionPad key={rx._id} prescription={rx} />
            ))
          )}
        </div>
      )}

      {/* Tab 4: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Appt ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.appointments?.map((apt: any) => (
                <tr key={apt._id}>
                  <td className="py-3 px-4 font-mono font-bold text-teal-700">{apt.appointmentId}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.startTime}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{apt.doctorId?.name || 'Staff Doctor'}</td>
                  <td className="py-3 px-4 text-slate-600">{apt.reason}</td>
                  <td className="py-3 px-4 capitalize">{apt.type}</td>
                  <td className="py-3 px-4">
                    <Badge variant={apt.status === 'confirmed' ? 'brand' : apt.status === 'completed' ? 'success' : 'neutral'}>
                      {apt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Reminders */}
      {activeTab === 'reminders' && (
        <div className="space-y-3">
          {data.reminders?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12 bg-white rounded-3xl border border-slate-100">
              No reminders scheduled.
            </p>
          ) : (
            data.reminders.map((rem: any) => (
              <div key={rem._id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{rem.title}</span>
                  <span className="text-[11px] text-slate-500">{rem.description}</span>
                  <span className="text-[10px] text-teal-600 font-semibold block mt-1">
                    Due Date: {new Date(rem.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <Badge variant={rem.status === 'sent' ? 'success' : 'warning'}>{rem.status}</Badge>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Encounter Modal */}
      <Modal
        isOpen={isEncounterModalOpen}
        onClose={() => setIsEncounterModalOpen(false)}
        title="Document Clinical Encounter"
        subtitle={`Recording consultation notes for ${patient.firstName} ${patient.lastName}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateEncounter} className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">Vitals</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">BP (Systolic / Diastolic)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={encounterForm.bpSystolic}
                    onChange={(e) => setEncounterForm({ ...encounterForm, bpSystolic: e.target.value })}
                    className="w-16 rounded-xl border border-slate-200 p-2 text-center"
                    placeholder="120"
                  />
                  <span>/</span>
                  <input
                    type="text"
                    value={encounterForm.bpDiastolic}
                    onChange={(e) => setEncounterForm({ ...encounterForm, bpDiastolic: e.target.value })}
                    className="w-16 rounded-xl border border-slate-200 p-2 text-center"
                    placeholder="80"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={encounterForm.heartRate}
                  onChange={(e) => setEncounterForm({ ...encounterForm, heartRate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2"
                  placeholder="72"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Temperature (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={encounterForm.temperature}
                  onChange={(e) => setEncounterForm({ ...encounterForm, temperature: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2"
                  placeholder="98.6"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={encounterForm.weightKg}
                  onChange={(e) => setEncounterForm({ ...encounterForm, weightKg: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2"
                  placeholder="65"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chief Complaints *</label>
            <input
              type="text"
              required
              value={encounterForm.chiefComplaints}
              onChange={(e) => setEncounterForm({ ...encounterForm, chiefComplaints: e.target.value })}
              placeholder="e.g. Headache and elevated systolic blood pressure for 3 days"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Diagnosis *</label>
            <input
              type="text"
              required
              value={encounterForm.diagnosis}
              onChange={(e) => setEncounterForm({ ...encounterForm, diagnosis: e.target.value })}
              placeholder="e.g. Essential Hypertension Stage 1 (ICD-10 I10)"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold text-teal-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Clinical Notes & Findings</label>
            <textarea
              rows={3}
              value={encounterForm.clinicalNotes}
              onChange={(e) => setEncounterForm({ ...encounterForm, clinicalNotes: e.target.value })}
              placeholder="Physical examination notes, diagnostic assessment, rationale..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Follow-up Plan</label>
            <input
              type="text"
              value={encounterForm.followUpPlan}
              onChange={(e) => setEncounterForm({ ...encounterForm, followUpPlan: e.target.value })}
              placeholder="e.g. Recheck in 2 weeks with home BP readings"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEncounterModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm"
            >
              Save Encounter Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
