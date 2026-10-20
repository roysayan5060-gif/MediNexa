import React from 'react';

interface BadgeProps {
  variant?:
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral'
    | 'brand'
    | 'purple'
    | 'primary'
    | 'default'
    | 'gradient-brand'
    | 'gradient-sky'
    | 'gradient-amber';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '', dot = false }) => {
  const variantStyles: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs shadow-emerald-500/10',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-xs shadow-amber-500/10',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80 shadow-xs shadow-rose-500/10',
    info: 'bg-sky-50 text-sky-700 border-sky-200/80 shadow-xs shadow-sky-500/10',
    brand: 'bg-teal-50 text-teal-800 border-teal-200 shadow-xs shadow-teal-500/10',
    primary: 'bg-teal-50 text-teal-800 border-teal-200 shadow-xs shadow-teal-500/10',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 shadow-xs shadow-purple-500/10',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    'gradient-brand': 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-transparent shadow-sm shadow-teal-600/20 font-semibold',
    'gradient-sky': 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-transparent shadow-sm shadow-sky-600/20 font-semibold',
    'gradient-amber': 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-sm shadow-amber-600/20 font-semibold',
  };

  const dotColors: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    brand: 'bg-teal-500',
    primary: 'bg-teal-500',
    purple: 'bg-purple-500',
    neutral: 'bg-slate-400',
    default: 'bg-slate-400',
    'gradient-brand': 'bg-white',
    'gradient-sky': 'bg-white',
    'gradient-amber': 'bg-white',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
};
