'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Image as ImageIcon, Video, FileText,
  X, Send, Loader2, ChevronDown
} from 'lucide-react';
import { createPost } from '@/services/api';
import { useAuthStore, useFeedStore } from '@/store';

type PostType = 'note' | 'photo' | 'video';

const POST_TYPES: { type: PostType; icon: typeof FileText; label: string; desc: string }[] = [
  { type: 'note',  icon: FileText,   label: 'Note',  desc: 'Teks singkat / caption' },
  { type: 'photo', icon: ImageIcon,  label: 'Foto',  desc: 'Unggah hingga 4 foto'   },
  { type: 'video', icon: Video,      label: 'Video', desc: 'Unggah video pendek'     },
];

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { resetFeed } = useFeedStore();

  const [postType, setPostType]   = useState<PostType>('note');
  const [content,  setContent]    = useState('');
  const [files,    setFiles]      = useState<File[]>([]);
  const [previews, setPreviews]   = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,    setError]      = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).slice(0, postType === 'video' ? 1 : 4);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const switchType = (t: PostType) => {
    setPostType(t);
    setFiles([]);
    setPreviews([]);
    setShowTypePicker(false);
    // reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
      setError('Tulis sesuatu atau tambahkan media.');
      return;
    }
    if (content.length > 300) {
      setError('Caption maksimal 300 karakter.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (content.trim()) fd.append('content', content.trim());
      files.forEach(f => fd.append('images', f));

      const res = await createPost(fd);
      if (res.success) {
        // Reset feed so home refetches with the new post
        resetFeed();
        router.replace('/');
      } else {
        setError(res.message || 'Gagal membuat post.');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTypeInfo = POST_TYPES.find(t => t.type === postType)!;

  const acceptAttr = postType === 'video' ? 'video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi' : 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';
  const multipleAttr = postType !== 'video';

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white hover:text-white/70">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Buat Post</h1>

        {/* Post type selector */}
        <button
          onClick={() => setShowTypePicker(!showTypePicker)}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3 py-1.5 transition-all"
        >
          <currentTypeInfo.icon size={14} className="text-white" />
          <span className="text-white text-xs font-semibold">{currentTypeInfo.label}</span>
          <ChevronDown size={12} className={`text-white/60 transition-transform ${showTypePicker ? 'rotate-180' : ''}`} />
        </button>

        {/* Submit */}
        <motion.button
          onClick={handleSubmit}
          disabled={isLoading}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#FE2C55] text-white rounded-full text-sm font-bold disabled:opacity-50 transition-all"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {isLoading ? '...' : 'Post'}
        </motion.button>
      </div>

      {/* ── Type picker dropdown ── */}
      <AnimatePresence>
        {showTypePicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[60px] right-4 z-40 bg-[#1c1c1e] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
          >
            {POST_TYPES.map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => switchType(type)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-white/10 ${
                  postType === type ? 'bg-white/10' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  postType === type ? 'bg-[#FE2C55]' : 'bg-white/10'
                }`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-white/40 text-xs">{desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <div className="flex-1 p-4">
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Caption / text input */}
        <div className="mb-5">
          <textarea
            placeholder={
              postType === 'note'
                ? 'Apa yang sedang kamu pikirkan? ✍️'
                : postType === 'photo'
                ? 'Tambahkan caption untuk foto kamu... 📸'
                : 'Tambahkan deskripsi video... 🎬'
            }
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={300}
            rows={postType === 'note' ? 7 : 4}
            className="w-full bg-transparent text-white text-lg placeholder-white/25 outline-none resize-none leading-relaxed"
            autoFocus={postType === 'note'}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-white/20 text-xs">
              {postType === 'note' && content.trim().length === 0 && '💡 Note tampil sebagai kartu teks'}
            </span>
            <span className={`text-xs ${content.length > 280 ? 'text-red-400' : 'text-white/25'}`}>
              {content.length}/300
            </span>
          </div>
        </div>

        {/* Preview note card */}
        {postType === 'note' && content.trim() && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 border border-white/10"
          >
            <p className="text-white/30 text-3xl font-serif mb-1">"</p>
            <p className="text-white text-base leading-relaxed">{content}</p>
            <p className="text-white/30 text-3xl font-serif text-right mt-1">"</p>
          </motion.div>
        )}

        {/* Media previews */}
        {previews.length > 0 && (
          <div className={`grid gap-2 mb-4 ${
            previews.length === 1 ? 'grid-cols-1' :
            previews.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
          }`}>
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                {postType === 'video' ? (
                  <video src={src} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={src} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add media button — hanya untuk photo dan video */}
        {postType !== 'note' && (
          <div className="border-t border-white/10 pt-4">
            <input
              ref={fileRef}
              type="file"
              accept={acceptAttr}
              multiple={multipleAttr}
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 text-white/60 hover:text-white transition-colors w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center border border-white/15 border-dashed">
                {postType === 'video' ? <Video size={22} className="text-[#FE2C55]" /> : <ImageIcon size={22} className="text-[#FE2C55]" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">
                  {files.length > 0
                    ? `${files.length} file dipilih`
                    : postType === 'video' ? 'Pilih Video' : 'Pilih Foto'
                  }
                </p>
                <p className="text-xs text-white/30">
                  {postType === 'video' ? 'MP4, WebM, MOV (maks. 5MB)' : 'JPG, PNG, GIF (maks. 4 foto)'}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
