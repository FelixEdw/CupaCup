'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryGroup } from '@/types';
import { mediaUrl, viewStory, deleteStory } from '@/services/api';
import { useAuthStore } from '@/store';

interface StoryViewerProps {
  group: StoryGroup;
  onClose: () => void;
  onNextUser: () => void;
  onPrevUser: () => void;
}

export default function StoryViewer({ group, onClose, onNextUser, onPrevUser }: StoryViewerProps) {
  const { user } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const activeStory = group.stories[activeIndex];
  const isMyStory = user?.id === group.user_id;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(true);
    if (!window.confirm('Apakah Anda yakin ingin menghapus story ini?')) {
      setIsPaused(false);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteStory(activeStory.id);
      if (res.success) {
        onClose(); // Close viewer and trigger refetch
      } else {
        alert(res.message || 'Gagal menghapus story.');
        setIsPaused(false);
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus story.');
      setIsPaused(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset active story index when user group changes
  useEffect(() => {
    setActiveIndex(0);
    setProgress(0);
  }, [group]);

  // Mark story as viewed on active
  useEffect(() => {
    if (activeStory) {
      viewStory(activeStory.id).catch(err => console.error('Failed to view story:', err));
    }
  }, [activeStory]);

  // Progress bar logic
  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    const duration = 5000; // 5 seconds per story
    const step = 100; // update every 100ms
    const increment = (step / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, step);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [activeIndex, isPaused, group]);

  const handleNext = () => {
    setProgress(0);
    if (activeIndex < group.stories.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else {
      onNextUser();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    } else {
      onPrevUser();
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.floor(diff / (1000 * 60));
      return `${mins}m yang lalu`;
    }
    return `${hours}j yang lalu`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none"
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-50 flex gap-1.5">
        {group.stories.map((story, idx) => (
          <div key={story.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all ease-linear"
              style={{
                width:
                  idx < activeIndex
                    ? '100%'
                    : idx === activeIndex
                    ? `${progress}%`
                    : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Story Header */}
      <div className="absolute top-8 left-4 right-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-lg">
            {group.profile_pic_url ? (
              <img src={mediaUrl(group.profile_pic_url)} alt={group.username} className="w-full h-full object-cover" />
            ) : (
              group.username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-white font-bold text-sm drop-shadow">{group.full_name}</p>
            <p className="text-white/60 text-xs drop-shadow">{formatTime(activeStory.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMyStory && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-400 p-2 transition-colors duration-150"
            >
              {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsPaused(p => !p); }}
            className="text-white hover:opacity-80 p-2"
          >
            {isPaused ? <Play size={20} className="fill-white" /> : <Pause size={20} className="fill-white" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white hover:opacity-80 p-2"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Tap Areas for Navigation */}
      <div className="absolute inset-0 flex">
        <div className="w-[35%] h-full cursor-w-resize" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
        <div className="w-[30%] h-full" onClick={() => setIsPaused(p => !p)} />
        <div className="w-[35%] h-full cursor-e-resize" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
      </div>

      {/* Story Media */}
      <div className="w-full h-full flex items-center justify-center bg-black/90">
        <AnimatePresence mode="wait">
          {activeStory.media_type === 'video' ? (
            <video
              key={activeStory.id}
              src={mediaUrl(activeStory.media_url)}
              autoPlay
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <motion.img
              key={activeStory.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={mediaUrl(activeStory.media_url)}
              alt="Story"
              className="max-h-full max-w-full object-contain"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Story Caption / Footer */}
      {activeStory.content && (
        <div className="absolute bottom-10 left-4 right-4 z-40 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
          <p className="text-white text-base leading-relaxed font-medium">{activeStory.content}</p>
        </div>
      )}
    </motion.div>
  );
}
