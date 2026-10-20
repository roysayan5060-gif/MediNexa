import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Eye,
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { PrescriptionPad } from '../../components/prescription/PrescriptionPad';
import { PrescriptionItem } from '../../types';

export const PrescriptionBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patientId') || '');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [items, setItems] = useState<PrescriptionItem[]>([
    {
      medicineName: '',
      dosageStrength: '',
      route: 'Oral',
      frequency: 'Once Daily (OD)',
      duration: '5 Days',
      quantity: 5,
      foodInstruction: 'After Food',
      specialInstructions: '',
    },
  ]);

  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPrescription, setCreatedPrescription] = useState<any>(null);

  // Load patients for selector
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await api.get('/patients?limit=50');
        if (res.data.success) {
          setPatients(res.data.data);
          const initialId = searchParams.get('patientId');
          if (initialId) {
            const match = res.data.data.find((p: any) => p._id === initialId || p.patientId === initialId);
            if (match) {
              setSelectedPatientId(match._id);
              setSelectedPatient(match);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load patients for prescription builder:', err);
      }
    };
    loadPatients();
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const match = patients.find((p: any) => p._id === selectedPatientId);
      setSelectedPatient(match || null);
    }
  }, [selectedPatientId, patients]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineName: '',
        dosageStrength: '',
        route: 'Oral',
        frequency: 'Twice Daily (BD)',
        duration: '7 Days',
        quantity: 14,
        foodInstruction: 'After Food',
        specialInstructions: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPatientId) {
      setError('Please select a patient.');
      return;
    }

    const invalidItem = items.find((it) => !it.medicineName.trim() || !it.dosageStrength.trim());
    if (invalidItem) {
      setError('Please provide medicine name and dosage strength for all prescribed items.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        patientId: selectedPatientId,
        doctorId: user?.doctorId || (user?.profile && user.profile._id) || 'me',
        items,
        diagnosisSummary,
        additionalInstructions,
        followUpDate: followUpDate || undefined,
        status: 'active',
      };

      const res = await api.post('/prescriptions', payload);
      if (res.data.success) {
        setCreatedPrescription(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview object
  const previewPrescription: any = {
    prescriptionId: 'RX-PREVIEW',
    patientId: selectedPatient || { firstName: 'Selected', lastName: 'Patient', patientId: 'PAT-XXXX' },
    doctorId: {
      name: user?.name,
      specialty: 'Clinical Practitioner',
      registrationNumber: 'MED-AUTH',
      qualifications: ['MBBS'],
      clinicId: { name: 'Doctor X Healthcare Center', city: 'Metro' },
    },
    items,
    diagnosisSummary,
    additionalInstructions,
    followUpDate,
    status: 'draft',
    approvedByName: user?.name || 'Dr.',
    approvedAt: new Date().toISOString(),
  };

  if (createdPrescription) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-emerald-950">Prescription Finalized & Digitally Approved</h2>
              <p className="text-xs text-emerald-700">
                Prescription ID: <span className="font-mono font-bold">{createdPrescription.prescriptionId}</span> has been stored in patient's longitudinal EHR.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCreatedPrescription(null);
                setItems([
                  {
                    medicineName: '',
                    dosageStrength: '',
                    route: 'Oral',
                    frequency: 'Once Daily (OD)',
                    duration: '5 Days',
                    quantity: 5,
                    foodInstruction: 'After Food',
                    specialInstructions: '',
                  },
                ]);
              }}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              New Prescription
            </button>
            <button
              onClick={() => navigate(`/doctor/whatsapp-prescriptions?rxId=${createdPrescription._id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-sm transition"
            >
              <MessageSquare className="w-4 h-4" /> Send to WhatsApp
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition"
            >
              <Printer className="w-4 h-4" /> Print Document
            </button>
          </div>
        </div>

        <PrescriptionPad prescription={createdPrescription} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Structured Prescription Builder</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorized clinician interface with real-time dosage review and printable Rx pad
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/doctor/whatsapp-prescriptions')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 shadow-xs transition"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Dispatcher
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition"
          >
            <Eye className="w-4 h-4 text-teal-600" /> {isPreview ? 'Edit Mode' : 'Live Preview'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isPreview ? (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 text-center font-medium">
            Preview Mode: Review the prescription pad layout below before finalizing into the database.
          </div>
          <PrescriptionPad prescription={previewPrescription} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selector Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Patient & Indication
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} ({p.patientId}) - {p.gender}, {p.bloodGroup}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diagnosis / Indication Summary
                </label>
                <input
                  type="text"
                  value={diagnosisSummary}
                  onChange={(e) => setDiagnosisSummary(e.target.value)}
                  placeholder="e.g. Stage 1 Essential Hypertension (ICD-10 I10)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {selectedPatient && selectedPatient.allergies?.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>
                  Allergy Warning for {selectedPatient.firstName}: <strong className="underline">{selectedPatient.allergies.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Medicine Items Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Prescribed Medications
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select common clinical frequency abbreviations (OD, BD, TDS, QID, PRN, HS) and food instructions
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition"
              >
                <Plus className="w-4 h-4" /> Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-bold text-teal-800">Medication #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Medicine Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.medicineName}
                        onChange={(e) => handleItemChange(index, 'medicineName', e.target.value)}
                        placeholder="e.g. Ramipril / Amoxicillin"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Strength / Dosage *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.dosageStrength}
                        onChange={(e) => handleItemChange(index, 'dosageStrength', e.target.value)}
                        placeholder="e.g. 2.5 mg / 500 mg / 10 ml"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Route</label>
                      <select
                        value={item.route}
                        onChange={(e) => handleItemChange(index, 'route', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white"
                      >
                        {['Oral', 'Topical', 'Intravenous', 'Intramuscular', 'Inhalation', 'Ophthalmic', 'Sublingual', 'Other'].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={item.frequency}
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="Once Daily (OD)">Once Daily (OD)</option>
                        <option value="Twice Daily (BD)">Twice Daily (BD)</option>
                        <option value="Three Times Daily (TDS)">Three Times Daily (TDS)</option>
                        <option value="Four Times Daily (QID)">Four Times Daily (QID)</option>
                        <option value="As Needed (PRN)">As Needed (PRN)</option>
                        <option value="At Bedtime (HS)">At Bedtime (HS)</option>
                        <option value="Every Other Day">Every Other Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duration</label>
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                        placeholder="e.g. 5 Days, 1 Month"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Food Timing</label>
                      <select
                        value={item.foodInstruction}
                        onChange={(e) => handleItemChange(index, 'foodInstruction', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="Before Food">Before Food</option>
                        <option value="After Food">After Food</option>
                        <option value="With Food">With Food</option>
                        <option value="Empty Stomach">Empty Stomach</option>
                        <option value="No Specific Timing">No Specific Timing</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.specialInstructions}
                      onChange={(e) => handleItemChange(index, 'specialInstructions', e.target.value)}
                      placeholder="Special instructions: e.g. Take with full glass of water, finish whole course..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 focus:border-teal-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Guidance & Follow-up */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Instructions & Follow-up Date
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Patient Guidance
                </label>
                <textarea
                  rows={3}
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Maintain daily blood pressure log. Reduce salt intake. Aerobic exercise 30 mins daily..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Next Follow-up Review Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none mb-2"
                />
                <p className="text-[11px] text-slate-400">
                  Setting a follow-up date automatically registers a scheduled reminder in the background worker.
                </p>
              </div>
            </div>
          </div>

          {/* Clinician Approval & Submission Bar */}
          <div className="p-6 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Clinician Review & Approval Mandatory</p>
                <p className="text-[11px] text-slate-300">
                  You are prescribing as <strong className="text-teal-300">{user?.name}</strong>. Digital stamp will be recorded.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
              >
                Preview Pad
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-teal-950 bg-teal-400 hover:bg-teal-300 shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSubmitting ? 'Approving...' : 'Approve & Issue Prescription'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
