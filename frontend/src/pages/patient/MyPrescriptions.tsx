import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Prescription } from '../../types';
import { FileText, Printer, ArrowLeft } from 'lucide-react';
import { PrescriptionPad } from '../../components/prescription/PrescriptionPad';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export const MyPrescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/prescriptions');
        if (res.data.success) {
          setPrescriptions(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedRx(res.data.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load prescriptions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Retrieving your authorized prescriptions..." />;
  }

  if (prescriptions.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No Prescriptions on File"
        description="You do not have any prescriptions issued yet. Consultations with your doctor will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Prescriptions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified electronic prescriptions issued by your physician
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prescription Selector List */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Prescription History ({prescriptions.length})
          </span>

          {prescriptions.map((rx) => (
            <div
              key={rx._id}
              onClick={() => setSelectedRx(rx)}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                selectedRx?._id === rx._id
                  ? 'bg-teal-50/50 border-teal-500 shadow-xs ring-1 ring-teal-500/30'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-teal-800">{rx.prescriptionId}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(rx.approvedAt || rx.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">
                Dr. {rx.doctorId?.name || rx.approvedByName}
              </p>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {rx.diagnosisSummary || `${rx.items?.length} medication(s)`}
              </p>
            </div>
          ))}
        </div>

        {/* Selected Prescription Pad Preview */}
        <div className="lg:col-span-2">
          {selectedRx ? (
            <PrescriptionPad prescription={selectedRx} />
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-xs text-slate-400">
              Select a prescription from the left to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
