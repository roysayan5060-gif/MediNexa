import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  Stethoscope,
  HeartPulse,
  Receipt,
  UserCheck,
  Sparkles,
  Wallet,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-transparent text-teal-900 border-l-4 border-teal-600 shadow-xs'
        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
    }`;

  const iconContainerClass = (colorClass: string) =>
    `w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-xs ${colorClass}`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-slate-200/80 bg-white/95 backdrop-blur-md transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between p-4 overflow-y-auto`}
      >
        <div className="space-y-6">
          {/* Role Section Header */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
              {role === 'doctor' && '🩺 Clinical Workspace'}
              {role === 'patient' && '🧑‍💼 Patient Health Center'}
              {role === 'clinic_admin' && '🏥 Clinic Operations Center'}
              {role === 'platform_admin' && '🛡️ System Administration'}
            </span>
          </div>

          {/* Navigation Links based on role */}
          <nav className="space-y-1.5">
            {role === 'doctor' && (
              <>
                <NavLink to="/doctor/dashboard" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-teal-50 text-teal-700 border border-teal-200/60')}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  Doctor Dashboard
                </NavLink>
                <NavLink to="/doctor/patients" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-cyan-50 text-cyan-700 border border-cyan-200/60')}>
                    <Users className="w-4 h-4" />
                  </div>
                  My Patients
                </NavLink>
                <NavLink to="/doctor/appointments" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-indigo-50 text-indigo-700 border border-indigo-200/60')}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  Appointments Queue
                </NavLink>
                <NavLink to="/doctor/prescriptions/new" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-emerald-50 text-emerald-700 border border-emerald-200/60')}>
                    <FileText className="w-4 h-4" />
                  </div>
                  Prescription Builder
                </NavLink>
                <NavLink to="/doctor/whatsapp-prescriptions" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-green-100 text-green-700 border border-green-300')}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span>WhatsApp Rx</span>
                    <span className="text-[9px] bg-green-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Send Direct
                    </span>
                  </div>
                </NavLink>
                <NavLink to="/doctor/dashboard#earnings" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-amber-50 text-amber-700 border border-amber-200/60')}>
                    <Coins className="w-4 h-4" />
                  </div>
                  Earnings & Settlements
                </NavLink>
              </>
            )}

            {role === 'patient' && (
              <>
                <NavLink to="/patient/portal" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-sky-50 text-sky-700 border border-sky-200/60')}>
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  My Health Portal
                </NavLink>
                <NavLink to="/patient/doctors" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-teal-50 text-teal-700 border border-teal-200/60')}>
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  Find Clinic & Doctor
                </NavLink>
                <NavLink to="/patient/appointments" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-indigo-50 text-indigo-700 border border-indigo-200/60')}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  My Appointments
                </NavLink>
                <NavLink to="/patient/prescriptions" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-cyan-50 text-cyan-700 border border-cyan-200/60')}>
                    <FileText className="w-4 h-4" />
                  </div>
                  My Prescriptions
                </NavLink>
                <NavLink to="/patient/payments" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-emerald-50 text-emerald-700 border border-emerald-200/60')}>
                    <Receipt className="w-4 h-4" />
                  </div>
                  Bills & Payments
                </NavLink>
                <NavLink to="/patient/records" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-purple-50 text-purple-700 border border-purple-200/60')}>
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  Medical Records (EMR)
                </NavLink>
              </>
            )}

            {role === 'clinic_admin' && (
              <>
                <NavLink to="/clinic/dashboard" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-amber-50 text-amber-700 border border-amber-200/60')}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  Clinic Operations Center
                </NavLink>
                <NavLink to="/doctor/appointments" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-orange-50 text-orange-700 border border-orange-200/60')}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  Master Schedule & Queue
                </NavLink>
                <NavLink to="/doctor/patients" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-teal-50 text-teal-700 border border-teal-200/60')}>
                    <Users className="w-4 h-4" />
                  </div>
                  Patient Directory
                </NavLink>
              </>
            )}

            {role === 'platform_admin' && (
              <>
                <NavLink to="/admin/dashboard" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-purple-50 text-purple-700 border border-purple-200/60')}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  Platform Metrics
                </NavLink>
                <NavLink to="/admin/users" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-indigo-50 text-indigo-700 border border-indigo-200/60')}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  User Accounts
                </NavLink>
                <NavLink to="/admin/audit-logs" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-rose-50 text-rose-700 border border-rose-200/60')}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  Security Audit Trail
                </NavLink>
                <NavLink to="/patient/doctors" onClick={onClose} className={navLinkClass}>
                  <div className={iconContainerClass('bg-teal-50 text-teal-700 border border-teal-200/60')}>
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  Physician Registry
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Colorful Clinical Badge Footer */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 p-4 text-white shadow-lg shadow-teal-700/20">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 rounded-full bg-white/10 blur-sm pointer-events-none" />
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-200">
              Live Clinical Node
            </span>
          </div>
          <p className="text-xs font-bold text-white">Doctor X Healthcare</p>
          <p className="text-[10px] text-teal-100/80 mt-0.5">Three-Sided Clinic & DPDP Compliant</p>
        </div>
      </aside>
    </>
  );
};
