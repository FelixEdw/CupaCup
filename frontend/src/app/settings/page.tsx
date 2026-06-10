'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { updateProfile } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { useAuthStore } from '@/store';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser, logout } = useAuthStore();

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('bio', form.bio);
      if (avatar) fd.append('image', avatar);

      const res = await updateProfile(fd);
      if (res.success) {
        updateUser(res.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(res.message || 'Gagal memperbarui profil.');
      }
    } catch {
      setError('Terjadi kesalahan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const currentAvatar = avatarPreview || (user?.profile_pic_url ? mediaUrl(user.profile_pic_url) : null);

  return (
    <div className="h-full overflow-y-auto bg-black pb-24">
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white hover:text-white/70">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-bold text-lg">Pengaturan Profil</h1>
      </div>

      <div className="px-4 py-6">
        {/* Avatar upload */}
        <div className="flex flex-col items-center mb-8">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-3xl">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={24} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
          <p className="text-white/50 text-xs mt-2">Tap untuk ganti foto profil</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {success && (
            <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-xl text-green-400 text-sm text-center">
              ✅ Profil berhasil diperbarui!
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-white/60 text-sm block mb-2">Nama Lengkap</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-dark"
              placeholder="Nama lengkap kamu"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-white/60 text-sm block mb-2">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input-dark resize-none"
              placeholder="Ceritakan tentang dirimu (maks. 160 karakter)"
              maxLength={160}
              rows={4}
            />
            <div className="text-right mt-1">
              <span className="text-white/30 text-xs">{form.bio.length}/160</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-white/60 text-sm block mb-1">Username</label>
            <p className="text-white/80">@{user?.username}</p>
            <p className="text-white/30 text-xs mt-1">Username tidak dapat diubah</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-white/60 text-sm block mb-1">Email</label>
            <p className="text-white/80">{user?.email}</p>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Perubahan'}
          </motion.button>
        </form>

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-all"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
