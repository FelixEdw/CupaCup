'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useFeedStore } from '@/store';
import { getAuthFeed } from '@/services/api';
import VideoCard from './VideoCard';
import { Loader2, PenSquare } from 'lucide-react';
import Link from 'next/link';

// Virtual window size — only render max 5 cards at a time
const WINDOW_SIZE = 5;

export default function VideoFeed() {
  const { posts, currentIndex, setCurrentIndex, setPosts, setLoading, isLoading } = useFeedStore();
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const fetchFeed = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    try {
      const res = await getAuthFeed();
      if (res.success && res.data) {
        setPosts(res.data);
      } else {
        setError('Gagal memuat feed. Coba lagi nanti.');
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [setPosts, setLoading]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Compute the virtual window
  const start = Math.max(0, currentIndex - 1);
  const end = Math.min(posts.length, start + WINDOW_SIZE);
  const windowedPosts = posts.slice(start, end);

  const handleVisible = useCallback(
    (index: number) => {
      setCurrentIndex(index);
    },
    [setCurrentIndex]
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-[#FE2C55] animate-spin" size={40} />
          <p className="text-white/60 text-sm">Memuat post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="text-5xl">😞</div>
          <p className="text-white text-lg font-semibold">{error}</p>
          <button
            onClick={() => {
              hasFetched.current = false;
              setError(null);
              fetchFeed();
            }}
            className="px-6 py-3 bg-[#FE2C55] text-white rounded-full font-semibold hover:bg-[#e0243c] transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black gap-5 px-8 text-center">
        <div className="text-6xl">✨</div>
        <p className="text-white text-xl font-bold">Feed masih kosong</p>
        <p className="text-white/50 text-sm leading-relaxed">
          Belum ada post dari orang yang kamu follow.<br />Jadilah yang pertama posting!
        </p>
        <Link
          href="/create"
          className="flex items-center gap-2 bg-[#FE2C55] text-white px-6 py-3 rounded-full font-bold hover:bg-[#e0243c] transition-all"
        >
          <PenSquare size={18} />
          Buat Post Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={feedRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {windowedPosts.map((post, i) => {
        const absoluteIndex = start + i;
        return (
          <VideoCard
            key={post.id}
            post={post}
            index={absoluteIndex}
            isActive={absoluteIndex === currentIndex}
            onVisible={handleVisible}
          />
        );
      })}

      {/* Loading more indicator */}
      {currentIndex >= posts.length - 2 && (
        <div className="h-screen flex items-center justify-center bg-black snap-start">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-[#FE2C55] animate-spin" size={32} />
            <p className="text-white/60 text-sm">Memuat lebih banyak...</p>
          </div>
        </div>
      )}
    </div>
  );
}
