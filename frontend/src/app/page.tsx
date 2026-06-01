'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import VideoFeed from '@/components/VideoFeed';
import { PenSquare } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [feedType, setFeedType] = useState<'foryou' | 'following'>('foryou');

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
      {/* Top bar — Centered, premium styling with HSL/transparent black backdrop */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-8 pt-4 pb-2 bg-gradient-to-b from-black/60 to-transparent">
        {/* Following Tab */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setFeedType('following')}
            className={`text-[16px] font-semibold transition-all ${
              feedType === 'following' ? 'text-white font-bold' : 'text-white/50 hover:text-white'
            }`}
          >
            Following
          </button>
          <div
            className={`w-6 h-0.5 bg-[#FE2C55] rounded-full mt-1 transition-all ${
              feedType === 'following' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          />
        </div>

        {/* For You Tab */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setFeedType('foryou')}
            className={`text-[16px] font-semibold transition-all ${
              feedType === 'foryou' ? 'text-white font-bold' : 'text-white/50 hover:text-white'
            }`}
          >
            For You
          </button>
          <div
            className={`w-6 h-0.5 bg-[#FE2C55] rounded-full mt-1 transition-all ${
              feedType === 'foryou' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          />
        </div>
      </div>

      {/* Feed */}
      <VideoFeed type={feedType} />
    </div>
  );
}

