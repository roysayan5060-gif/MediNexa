import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, LogOut, User as UserIcon, CheckCheck, Menu, Sparkles, Activity, Stethoscope } from 'lucide-react';
import { Badge } from './Badge';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const roleConfigs: Record<string, { label: string; gradient: string; glow: string; icon: string }> = {
    doctor: {
      label: 'Doctor',
      gradient: 'from-teal-600 via-emerald-600 to-cyan-600',
      glow: 'shadow-teal-500/20 text-teal-700 bg-teal-50 border-teal-200',
      icon: '🩺',
    },
    patient: {
      label: 'Patient',
      gradient: 'from-sky-500 via-blue-600 to-indigo-600',
      glow: 'shadow-sky-500/20 text-sky-700 bg-sky-50 border-sky-200',
      icon: '🧑‍💼',
    },
    clinic_admin: {
      label: 'Clinic Admin',
      gradient: 'from-amber-500 via-orange-600 to-rose-600',
      glow: 'shadow-amber-500/20 text-amber-700 bg-amber-50 border-amber-200',
      icon: '🏥',
    },
    platform_admin: {
      label: 'Platform Admin',
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      glow: 'shadow-purple-500/20 text-purple-700 bg-purple-50 border-purple-200',
      icon: '🛡️',
    },
  };

  const currentRole = user?.role ? roleConfigs[user.role] : {
    label: 'User',
    gradient: 'from-slate-600 to-slate-800',
    glow: 'text-slate-700 bg-slate-50 border-slate-200',
    icon: '👤',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 md:px-8 backdrop-blur-md shadow-xs">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          {/* Glowing Brand Icon */}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-400 to-indigo-500 opacity-60 blur-xs group-hover:opacity-100 transition duration-300" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-700 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-700/30">
              <Stethoscope className="w-5 h-5 text-white stroke-[2.3]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-tight text-lg bg-gradient-to-r from-teal-900 via-teal-700 to-slate-900 bg-clip-text text-transparent">
                Doctor X
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs shadow-teal-500/20">
                <Sparkles className="w-2.5 h-2.5" /> Healthcare
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-2xl p-2.5 text-slate-500 hover:bg-teal-50/70 hover:text-teal-700 transition duration-150 border border-slate-200/60"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-[10px] font-black text-white shadow-md shadow-rose-500/30 ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-md shadow-2xl border border-slate-100 py-3 z-50">
              <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => markAsRead(n._id)}
                      className={`p-3.5 hover:bg-teal-50/40 cursor-pointer transition flex items-start gap-3 ${
                        !n.read ? 'bg-teal-50/30' : ''
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !n.read ? 'bg-gradient-to-r from-teal-500 to-cyan-500 ring-2 ring-teal-200' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-teal-600 font-semibold mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300/80 flex items-center justify-center text-slate-700 font-black text-sm shadow-xs">
            {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</p>
            <div className="mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentRole.glow}`}>
                <span>{currentRole.icon}</span> {currentRole.label}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
