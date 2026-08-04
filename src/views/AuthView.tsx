import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { AdminUser } from '../types';

interface AuthViewProps {
  onLoginSuccess: (user: { name: string; email: string; role: string }) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) { setErrorMsg('Please enter email and password.'); return; }

    setLoading(true);
    const { data, error } = await supabase.rpc('login_admin', {
      p_email: email,
      p_password: password,
    });
    setLoading(false);

    if (error) { setErrorMsg(error.message); return; }
    if (data?.error) { setErrorMsg(data.error); return; }

    onLoginSuccess({ name: data.full_name, email: data.email, role: data.role });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fullName || !email || !password) { setErrorMsg('Please fill all required fields.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }

    setLoading(true);
    const { data, error } = await supabase.rpc('register_admin', {
      p_full_name: fullName,
      p_email: email,
      p_password: password,
      p_mobile: mobile || '',
      p_role: 'super_admin',
    });
    setLoading(false);

    if (error) { setErrorMsg(error.message); return; }
    if (data?.error) { setErrorMsg(data.error); return; }

    setSuccessMsg('Admin account created! You can now sign in.');
    setMode('login');
    setEmail(email);
    setPassword('');
    setFullName('');
    setMobile('');
  };

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4 relative overflow-hidden text-[#dce2f6]">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f2ca50]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#19202e] border-2 border-[#f2ca50]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(242,202,80,0.15)] z-10 relative">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#f2ca50] mx-auto flex items-center justify-center shadow-xl mb-3">
            <span
              className="material-symbols-outlined text-[#3c2f00] font-bold text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              temple_hindu
            </span>
          </div>
          <h1 className="font-serif-headline text-3xl font-bold text-[#f2ca50]">Sadhana Admin</h1>
          <p className="text-xs text-[#d0c5af]/70 mt-1 font-sans uppercase tracking-[0.2em]">
            Vedic Sacred CMS Portal
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0c1321] p-1 rounded-2xl border border-white/10 mb-6 text-xs font-semibold">
          <button
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'login' ? 'bg-[#f2ca50] text-[#3c2f00] font-bold shadow' : 'text-[#d0c5af] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'register' ? 'bg-[#f2ca50] text-[#3c2f00] font-bold shadow' : 'text-[#d0c5af] hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {successMsg}
          </div>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-semibold text-[#f2ca50] block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Arjun Varma"
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#f2ca50] block mb-1">Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-[#f2ca50] block mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sadhana.app"
              className="w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#f2ca50] block mb-1">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#f2ca50] text-[#3c2f00] font-bold text-xs rounded-xl hover:bg-[#ffe082] transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-base font-bold">
                {mode === 'login' ? 'login' : 'person_add'}
              </span>
            )}
            {loading ? 'Please wait...' : mode === 'login' ? 'Enter Sacred CMS' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
