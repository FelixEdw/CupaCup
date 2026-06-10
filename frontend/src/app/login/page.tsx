'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, AlertCircle, LogIn } from 'lucide-react';
import { login, register } from '@/services/api';
import { useAuthStore } from '@/store';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
  });

  // Handle Google OAuth callback
  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(atob(userStr));
        setAuth(token, user);
        router.replace('/');
      } catch {}
    }
  }, [searchParams, setAuth, router]);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await login({ email: form.email, password: form.password });
        if (res.success && res.data) {
          setAuth(res.data.token, res.data.user);
          router.replace('/');
        } else {
          setError(res.message || 'Login gagal.');
        }
      } else {
        const res = await register({
          email: form.email,
          password: form.password,
          username: form.username,
          full_name: form.full_name || form.username,
        });
        if (res.success && res.data) {
          setAuth(res.data.token, res.data.user);
          router.replace('/');
        } else {
          setError(res.message || 'Registrasi gagal.');
        }
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      API_BASE = `http://${hostname}:3001`;
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-between py-10 px-6 relative overflow-hidden font-sans">
      {/* Background decorations: Glowing Wave */}
      <div className="absolute inset-x-0 top-[20%] h-48 pointer-events-none z-0">
        <svg viewBox="0 0 375 120" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M -20 50 Q 80 120, 180 70 T 395 30"
            stroke="url(#wave-gradient)"
            strokeWidth="2"
            className="opacity-70"
          />
          <path
            d="M -20 50 Q 80 120, 180 70 T 395 30"
            stroke="url(#wave-gradient)"
            strokeWidth="6"
            className="opacity-25 blur-[6px]"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" /> {/* Purple */}
              <stop offset="50%" stopColor="#EC4899" /> {/* Pink */}
              <stop offset="100%" stopColor="#F59E0B" /> {/* Amber */}
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Navigation Bar */}
      <div className="w-full flex items-center justify-between z-10 max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center">
          <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current text-white">
            <path d="M 35 15 C 35 25, 25 35, 15 35 C 5 35, 5 65, 15 65 C 25 65, 35 75, 35 85 C 35 95, 65 95, 65 85 C 65 75, 75 65, 85 65 C 95 65, 95 35, 85 35 C 75 35, 65 25, 65 15 C 65 5, 35 5, 35 15 Z M 50 35 C 58 35, 65 42, 65 50 C 65 58, 58 65, 50 65 C 42 65, 35 58, 35 50 C 35 42, 42 35, 50 35 Z" fillRule="evenodd" />
          </svg>
        </div>

        {/* Toggler */}
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors cursor-pointer"
        >
          <User size={18} strokeWidth={2} />
          <span>{isLogin ? 'Sign Up' : 'Sign In'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center z-10 my-8">
        {/* Header Title */}
        <h2 className="text-[40px] font-bold tracking-tight text-white mb-10 text-center leading-none">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </h2>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 mb-6"
          >
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-white/45 text-[13px] font-semibold text-center uppercase tracking-wider">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full rounded-full bg-neutral-900 border border-white/5 py-4 px-6 text-center text-white placeholder-white/20 text-[15px] outline-none focus:border-white/20 transition-all font-medium"
                    required
                    minLength={3}
                    maxLength={50}
                    pattern="[a-zA-Z0-9_]+"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-white/45 text-[13px] font-semibold text-center uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your name (optional)"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full rounded-full bg-neutral-900 border border-white/5 py-4 px-6 text-center text-white placeholder-white/20 text-[15px] outline-none focus:border-white/20 transition-all font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-white/45 text-[13px] font-semibold text-center uppercase tracking-wider">Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="hannadowie@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-full bg-neutral-900 border border-white/5 py-4 px-6 text-center text-white placeholder-white/25 text-[15px] outline-none focus:border-white/15 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/45 text-[13px] font-semibold text-center uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="****************"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-full bg-neutral-900 border border-white/5 py-4 px-6 text-center text-white placeholder-white/25 text-[15px] outline-none focus:border-white/15 transition-all font-medium tracking-[0.15em]"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Action submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full rounded-full p-[1.5px] focus:outline-none transition-all active:scale-[0.98] group mt-3 cursor-pointer"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] rounded-full" />
            <span className="relative flex items-center justify-center gap-2 px-6 py-4 bg-black rounded-full text-white font-semibold text-[15px] hover:bg-neutral-950 transition-colors">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} className="text-white/80" />
                  <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                </>
              )}
            </span>
          </button>
        </form>

        {/* Skip option */}
        <div className="text-center mt-6">
          <Link href="/" className="text-white/30 text-sm hover:text-white/60 transition-colors">
            Lihat tanpa login →
          </Link>
        </div>
      </div>

      {/* Social login section at the bottom */}
      <div className="w-full max-w-sm mx-auto text-center z-10">
        <p className="text-white/40 text-[13px] font-medium mb-4">
          or {isLogin ? 'Sign In' : 'Sign Up'} with
        </p>
        <div className="flex items-center justify-center gap-4">
          {/* Google */}
          <a
            href={`${API_BASE}/api/auth/google`}
            className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-white hover:bg-neutral-800 transition-colors hover:scale-105 active:scale-95"
            title="Sign In with Google"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.8"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity="0.7"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.9"/>
            </svg>
          </a>

          {/* Instagram */}
          <button
            onClick={() => setError('Sign In via Instagram segera hadir!')}
            className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-white hover:bg-neutral-800 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
            title="Sign In with Instagram"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </button>

          {/* X (Twitter) */}
          <button
            onClick={() => setError('Sign In via X segera hadir!')}
            className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-white hover:bg-neutral-800 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
            title="Sign In with X"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>

          {/* TikTok */}
          <button
            onClick={() => setError('Sign In via TikTok segera hadir!')}
            className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-white hover:bg-neutral-800 transition-colors hover:scale-105 active:scale-95 cursor-pointer"
            title="Sign In with TikTok"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.62 4.17.94.99 2.23 1.63 3.59 1.83v3.7c-1.39-.08-2.74-.63-3.82-1.53-.16-.14-.3-.29-.44-.45v5.3c0 2.2-.68 4.35-2.02 5.92-1.55 1.86-3.95 2.92-6.35 2.87-2.26-.01-4.48-1.07-5.94-2.82-1.7-1.95-2.31-4.67-1.71-7.18.52-2.24 1.94-4.22 3.93-5.32 1.58-.91 3.42-1.22 5.23-.88V9.7c-1.37-.36-2.89-.13-4.08.62-1.08.66-1.83 1.79-2.07 3.03-.31 1.56.12 3.23 1.17 4.36.93 1.05 2.3 1.67 3.72 1.65 1.5-.01 2.93-.81 3.73-2.1.47-.73.68-1.59.67-2.45V.02z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
