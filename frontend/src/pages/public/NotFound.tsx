import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto shadow-xs">
          <Stethoscope className="w-8 h-8 stroke-[2.3]" />
        </div>

        <div>
          <span className="font-mono text-3xl font-black text-teal-700">404</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">Page Not Found</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The page or clinical resource you requested does not exist or may have been relocated.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Home className="w-3.5 h-3.5" /> Return to Homepage
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous Page
          </button>
        </div>
      </div>
    </div>
  );
};
