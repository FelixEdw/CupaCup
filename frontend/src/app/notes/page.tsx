'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import VideoFeed from '@/components/VideoFeed';
import { PenSquare } from 'lucide-react';
import Link from 'next/link';

export default function NotesPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Wait for Zustand hydration then check auth
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setChecked(true);
      if (!useAuthStore.getState().isAuthenticated) {
        router.replace('/login');
      }
    });

    // If already hydrated (persist finished before this mount)
    if (useAuthStore.persist.hasHydrated()) {
      setChecked(true);
      if (!useAuthStore.getState().isAuthenticated) {
        router.replace('/login');
      }
    }

    return () => unsub();
  }, [router]);

  // Show spinner until hydration check done
  if (!checked) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative h-full overflow-hidden bg-black">
      {/* Top bar — khusus untuk Cuapan */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3 pb-2">
        {/* Tab tengah */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <button className="text-white text-[15px] font-bold">Cuapan</button>
            <div className="w-5 h-0.5 bg-white rounded-full mt-0.5" />
          </div>
        </div>

        {/* Tombol buat post kanan */}
        <Link
          href="/create"
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3 py-1.5 transition-all"
        >
          <PenSquare size={14} className="text-white" />
          <span className="text-white text-xs font-semibold">Post Cuapan</span>
        </Link>
      </div>

      {/* Feed */}
      <VideoFeed type="notes" />
    </div>
  );
}
