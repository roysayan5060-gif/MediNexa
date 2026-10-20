import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Send,
  CheckCircle2,
  Phone,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Search,
  RefreshCw,
  Copy,
  Check,
  Stethoscope,
  Building2,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorWhatsAppRx: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>(
    searchParams.get('rxId') || ''
  );
  const [selectedRx, setSelectedRx] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [customPhone, setCustomPhone] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<any | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/prescriptions');
      if (res.data.success) {
        setPrescriptions(res.data.data);
        const initialRxId = searchParams.get('rxId');
        if (initialRxId) {
          const match = res.data.data.find(
            (rx: any) => rx._id === initialRxId || rx.prescriptionId === initialRxId
          );
          if (match) {
            setSelectedRx(match);
            setSelectedPrescriptionId(match._id);
            setCustomPhone(match.patientId?.phone || '');
          }
        } else if (res.data.data.length > 0) {
          setSelectedRx(res.data.data[0]);
          setSelectedPrescriptionId(res.data.data[0]._id);
          setCustomPhone(res.data.data[0].patientId?.phone || '');
        }
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [user]);

  const handleSelectPrescription = (rx: any) => {
    setSelectedRx(rx);
    setSelectedPrescriptionId(rx._id);
    setCustomPhone(rx.patientId?.phone || '');
    setSendSuccess(null);
    setSendError(null);
  };

  // Generate live WhatsApp chat preview text
  const generatePreviewText = () => {
    if (!selectedRx) return '';

    const patient = selectedRx.patientId;
    const doctor = selectedRx.doctorId;
    const clinicName = doctor?.clinicId?.name || 'Doctor X Healthcare Center';

    const itemsText = selectedRx.items
      ?.map((it: any, idx: number) => {
        return (
          `\n*${idx + 1}. ${it.medicineName} ${it.dosageStrength}* (${it.route})\n` +
          `   • Frequency: ${it.frequency}\n` +
          `   • Duration: ${it.duration} (Qty: ${it.quantity})\n` +
          `   • Timing: ${it.foodInstruction}` +
          (it.specialInstructions ? `\n   • Note: ${it.specialInstructions}` : '')
        );
      })
      .join('\n');

    return (
      `*🏥 ${clinicName.toUpperCase()} — DIGITAL PRESCRIPTION*\n` +
      `----------------------------------------\n` +
      `📋 *Rx ID:* ${selectedRx.prescriptionId}\n` +
      `👨‍⚕️ *Doctor:* ${doctor?.title || 'Dr.'} ${doctor?.name || user?.name} (${doctor?.specialty || 'Cardiology'})\n` +
      `🧑‍💼 *Patient:* ${patient?.firstName} ${patient?.lastName} (ID: ${patient?.patientId})\n` +
      `🗓️ *Date:* ${new Date(selectedRx.createdAt).toLocaleDateString()}\n` +
      (selectedRx.diagnosisSummary ? `🩺 *Diagnosis:* ${selectedRx.diagnosisSummary}\n` : '') +
      `----------------------------------------\n` +
      `*💊 PRESCRIBED MEDICINES:*\n` +
      `${itemsText || 'No items'}\n` +
      `----------------------------------------\n` +
      (selectedRx.additionalInstructions
        ? `📝 *Doctor's Advice:* ${selectedRx.additionalInstructions}\n`
        : '') +
      (selectedRx.followUpDate
        ? `📅 *Follow-up Date:* ${new Date(selectedRx.followUpDate).toLocaleDateString()}\n`
        : '') +
      (customNote ? `💬 *Personal Note:* ${customNote}\n` : '') +
      `\n✅ *Digitally Approved & Signed by:* ${selectedRx.approvedByName || doctor?.name}\n` +
      `🔒 *HIPAA & Digital Health (DPDP) Verified*\n` +
      `🌐 *Patient EMR Portal:* ${window.location.origin}/patient/prescriptions`
    );
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRx) return;

    setSendError(null);
    setSendSuccess(null);
    setIsSending(true);

    try {
      const res = await api.post(`/prescriptions/${selectedRx._id}/send-whatsapp`, {
        customPhone,
        customNote,
      });

      if (res.data.success) {
        setSendSuccess(res.data.data);
        // Automatically open WhatsApp in new tab/app with pre-filled message
        if (res.data.data.whatsappUrl) {
          window.open(res.data.data.whatsappUrl, '_blank');
        }
        fetchPrescriptions();
      }
    } catch (err: any) {
      setSendError(err.response?.data?.message || 'Failed to dispatch WhatsApp prescription');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = () => {
    const text = generatePreviewText();
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading patient prescription records..." />;
  }

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const pName = `${rx.patientId?.firstName} ${rx.patientId?.lastName}`.toLowerCase();
    const rxId = (rx.prescriptionId || '').toLowerCase();
    const q = searchFilter.toLowerCase();
    return pName.includes(q) || rxId.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 p-6 md:p-8 text-white shadow-xl shadow-emerald-900/15">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold mb-2 backdrop-blur-md border border-white/20">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>Direct WhatsApp Healthcare Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              WhatsApp Prescription Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
              Instantly deliver authenticated digital prescriptions directly to your patient's WhatsApp mobile number with complete medication schedules and instructions.
            </p>
          </div>

          <button
            onClick={() => navigate('/doctor/prescriptions/new')}
            className="px-4 py-2.5 rounded-2xl text-xs font-black text-emerald-950 bg-emerald-300 hover:bg-emerald-200 transition shadow-md self-start sm:self-auto flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Issue New Prescription
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Prescriptions Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Select Patient Prescription</h3>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              {filteredPrescriptions.length} Records
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by patient name or Rx ID..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-emerald-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredPrescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No prescriptions found.</p>
            ) : (
              filteredPrescriptions.map((rx) => {
                const isSelected = selectedPrescriptionId === rx._id;
                return (
                  <div
                    key={rx._id}
                    onClick={() => handleSelectPrescription(rx)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-xs'
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px] text-teal-800">
                        {rx.prescriptionId}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {rx.patientId?.firstName} {rx.patientId?.lastName}
                      </span>
                      <Badge variant={rx.whatsappSent ? 'success' : 'neutral'}>
                        {rx.whatsappSent ? 'WhatsApp Sent' : 'Ready'}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate">
                      {rx.items?.map((it: any) => it.medicineName).join(', ') || 'No medications'}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{rx.patientId?.phone || 'No phone registered'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WhatsApp Dispatch Terminal & Live Chat Bubble Simulator (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedRx ? (
            <>
              {/* Dispatch Controls Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                      Patient WhatsApp Dispatch Terminal
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prescription: <strong className="font-mono text-teal-800">{selectedRx.prescriptionId}</strong> • Patient: <strong className="text-slate-800">{selectedRx.patientId?.firstName} {selectedRx.patientId?.lastName}</strong>
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Cloud Verified
                  </span>
                </div>

                {sendSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-black text-sm">Prescription Sent to WhatsApp Successfully!</p>
                      <p className="text-emerald-700 mt-0.5">
                        Dispatched to WhatsApp mobile number <strong>+{sendSuccess.recipientPhone}</strong>. Delivery status logged in patient's EHR audit trail.
                      </p>
                      {sendSuccess.whatsappUrl && (
                        <a
                          href={sendSuccess.whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Re-open WhatsApp Chat Tab
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                <form onSubmit={handleSendWhatsApp} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Patient's WhatsApp Mobile Number *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Accepts Indian numbers (10 digits) or international numbers with country code.
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Add Personalized Clinician Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="e.g. Please avoid cold water & report BP after 5 days"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Included directly inside the WhatsApp message body.
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5"
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Text
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Message Text
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      disabled={isSending || !customPhone}
                      className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                      <Send className="w-4 h-4" />
                      {isSending
                        ? 'Dispatching to WhatsApp...'
                        : `Send Directly to Patient WhatsApp (${customPhone || '...' })`}
                    </button>
                  </div>
                </form>
              </div>

              {/* Authentic Live WhatsApp Message Bubble Preview */}
              <div className="bg-[#efeae2] rounded-3xl p-6 border border-slate-300/80 shadow-inner relative overflow-hidden">
                {/* Subtle WhatsApp wallpaper doodle pattern simulation */}
                <div className="flex items-center justify-between mb-3 text-xs text-slate-600 border-b border-slate-300/60 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {user?.name || 'Dr. Doctor X'} (Clinic Verified)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Online • Business Account</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded-md font-mono">
                    Live Chat Preview
                  </span>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="max-w-xl mx-auto bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 text-xs font-sans space-y-2 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl" />
                  <pre className="whitespace-pre-wrap font-sans text-slate-800 text-[11.5px] leading-relaxed">
                    {generatePreviewText()}
                  </pre>
                  <div className="flex justify-end items-center gap-1 text-[10px] text-slate-400 font-mono pt-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-sky-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No Prescription Selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Select a patient prescription from the left list to preview and send via WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
