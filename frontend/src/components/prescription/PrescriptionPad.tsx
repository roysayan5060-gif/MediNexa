import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Prescription } from '../../types';
import { Printer, ShieldCheck, Heart, Sparkles, MessageSquare, CheckCircle } from 'lucide-react';
import { Badge } from '../common/Badge';

interface PrescriptionPadProps {
  prescription: Prescription;
  onPrint?: () => void;
}

export const PrescriptionPad: React.FC<PrescriptionPadProps> = ({ prescription, onPrint }) => {
  const navigate = useNavigate();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    if (prescription._id) {
      navigate(`/doctor/whatsapp-prescriptions?rxId=${prescription._id}`);
    }
  };

  const doctor = prescription.doctorId;
  const patient = prescription.patientId;

  const frequencyBadge = (freq: string) => {
    if (freq.includes('OD')) return 'bg-teal-50 text-teal-800 border-teal-200';
    if (freq.includes('BD')) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (freq.includes('TDS')) return 'bg-purple-50 text-purple-800 border-purple-200';
    if (freq.includes('QID')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (freq.includes('PRN')) return 'bg-rose-50 text-rose-800 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-teal-900/5 overflow-hidden my-4 print:border-none print:shadow-none print:m-0">
      {/* Top Action Bar (hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 border-b border-teal-100 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-xs">
            {prescription.prescriptionId}
          </span>
          <span className="text-xs text-teal-800 font-bold capitalize">
            Status: <span className="text-teal-600 underline">{prescription.status}</span>
          </span>
          {prescription.whatsappSent && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3 text-emerald-600" /> WhatsApp Sent
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {prescription._id && (
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-green-600 hover:bg-green-700 rounded-xl transition shadow-xs"
              title="Dispatch direct to patient WhatsApp number"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Direct
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-teal-950 bg-white border border-teal-200/80 hover:bg-teal-100/50 rounded-xl transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-teal-600" /> Print Formal Rx
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="p-8 md:p-12 space-y-6 print:p-0 relative">
        {/* Hospital / Clinic Letterhead Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-teal-600 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🩺</span>
              <h2 className="text-2xl font-black text-slate-900">
                {doctor?.name || prescription.approvedByName}
              </h2>
            </div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mt-1">
              {doctor?.specialty} {doctor?.qualifications?.length ? `• ${doctor.qualifications.join(', ')}` : ''}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Medical Reg No: <span className="font-bold text-slate-800">{doctor?.registrationNumber || 'MED-AUTHORIZED'}</span>
            </p>
          </div>

          <div className="sm:text-right text-xs text-slate-500">
            <h3 className="font-black text-sm text-slate-900">{doctor?.clinicId?.name || 'Apex Multispecialty Hospital'}</h3>
            <p className="mt-0.5">{doctor?.clinicId?.address || 'Medical Enclave, Central Healthcare Hub'}</p>
            <p>{doctor?.clinicId?.city ? `${doctor.clinicId.city}, ${doctor.clinicId.state}` : 'City Health Center'}</p>
            <p className="text-teal-700 font-bold mt-1">Phone: {doctor?.phone || doctor?.clinicId?.phone || '+1 (555) 0199'}</p>
          </div>
        </div>

        {/* Patient Details Banner with Colorful Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-teal-50/20 to-sky-50/20 border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Patient Name</span>
            <span className="font-black text-slate-900 text-sm">
              {patient?.firstName} {patient?.lastName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Patient ID</span>
            <span className="font-mono font-bold text-teal-800">{patient?.patientId}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Gender / Blood Group</span>
            <span className="font-bold text-slate-800 capitalize">
              {patient?.gender || 'N/A'} • <span className="text-rose-600">{patient?.bloodGroup || 'Unknown'}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold text-[10px] uppercase">Date of Issue</span>
            <span className="font-bold text-slate-800">
              {new Date(prescription.approvedAt || prescription.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Clinical Indication / Diagnosis */}
        {prescription.diagnosisSummary && (
          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 text-xs flex items-center gap-2">
            <span className="font-black text-teal-900 uppercase text-[10px] tracking-wider">Clinical Diagnosis:</span>
            <span className="font-bold text-teal-800">{prescription.diagnosisSummary}</span>
          </div>
        )}

        {/* Traditional Rx Monogram */}
        <div className="pt-1 flex items-center gap-2">
          <span className="text-3xl font-serif font-black text-teal-700 select-none">℞</span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Medical Order</span>
        </div>

        {/* Formatted Medication Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 font-bold">#</th>
                <th className="py-3 px-3 font-bold">Medicine & Strength</th>
                <th className="py-3 px-3 font-bold">Route</th>
                <th className="py-3 px-3 font-bold">Frequency</th>
                <th className="py-3 px-3 font-bold">Duration</th>
                <th className="py-3 px-3 font-bold">Food Timing</th>
                <th className="py-3 px-3 font-bold">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescription.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-teal-50/20">
                  <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block text-xs">{item.medicineName}</span>
                    <span className="text-[11px] text-teal-700 font-extrabold">{item.dosageStrength}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-600">{item.route}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[11px] border ${frequencyBadge(item.frequency)}`}>
                      {item.frequency}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.duration}</td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{item.foodInstruction}</td>
                  <td className="py-3 px-3 text-slate-500 italic">{item.specialInstructions || 'As directed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Additional Instructions & Review */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
          <div>
            <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-wider mb-1">
              General Patient Advice
            </h4>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
              {prescription.additionalInstructions || 'Take medications exactly as prescribed. Complete full course. Report adverse effects immediately.'}
            </p>
          </div>

          <div>
            <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-wider mb-1">
              Follow-Up Review
            </h4>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-slate-700 font-medium">
                {prescription.followUpDate ? (
                  <>
                    Next Scheduled Review: <span className="font-black text-teal-700">{new Date(prescription.followUpDate).toLocaleDateString()}</span>
                  </>
                ) : (
                  'Review as needed / SOS'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Digital Signature Footer */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-end border-t-2 border-slate-200 text-xs gap-4">
          <div className="flex items-center gap-2 text-slate-600 text-[11px] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Digitally authenticated in Doctor X Healthcare Certified EHR.</span>
          </div>

          <div className="text-center sm:text-right">
            <div className="font-serif italic text-slate-900 text-lg font-black underline decoration-teal-500 underline-offset-4">
              {prescription.approvedByName}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans font-bold">Authorized Clinician Signature</p>
            <p className="text-[10px] text-slate-400">Stamp Date: {new Date(prescription.approvedAt || prescription.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
