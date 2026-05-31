'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { StoryGroup } from '@/types';
import { getStoryFeed, createStory, mediaUrl } from '@/services/api';
import StoryRing from './StoryRing';
import StoryViewer from './StoryViewer';
import { AnimatePresence } from 'framer-motion';

export default function StoryBar() {
  const { user } = useAuthStore();
  const [feed, setFeed] = useState<StoryGroup[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFeed = async () => {
    try {
      const res = await getStoryFeed();
      if (res.success) {
        setFeed(res.data);
      }
    } catch (err) {
      console.error('Failed to load story feed:', err);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file); // 'image' field matches backend singleImage

    setIsUploading(true);
    try {
      const res = await createStory(formData);
      if (res.success) {
        // Refresh feed
        await fetchFeed();
      } else {
        alert(res.message || 'Gagal mengunggah story.');
      }
    } catch (err) {
      console.error('Error uploading story:', err);
      alert('Terjadi kesalahan saat mengunggah story.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  // Find current user's story group if any
  const myGroupIndex = feed.findIndex((g) => g.user_id === user?.id);
  const myGroup = myGroupIndex !== -1 ? feed[myGroupIndex] : null;

  // Filter out my group from general feed for rendering other stories
  const otherGroups = feed.filter((g) => g.user_id !== user?.id);

  const handleNextUser = () => {
    if (activeGroupIndex !== null && activeGroupIndex < feed.length - 1) {
      setActiveGroupIndex(activeGroupIndex + 1);
    } else {
      setActiveGroupIndex(null); // Close
      fetchFeed(); // Refresh viewed states
    }
  };

  const handlePrevUser = () => {
    if (activeGroupIndex !== null && activeGroupIndex > 0) {
      setActiveGroupIndex(activeGroupIndex - 1);
    } else {
      setActiveGroupIndex(null); // Close
      fetchFeed();
    }
  };

  return (
    <div className="w-full bg-black/40 backdrop-blur-md px-4 py-4 border-b border-white/10 flex items-center gap-4 overflow-x-auto shrink-0 select-none scrollbar-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* My Story Ring */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center p-[2.5px]">
          {/* Avatar Area */}
          <div
            onClick={() => {
              if (myGroup) {
                // If I have a story, view it
                const actualIdx = feed.findIndex((g) => g.user_id === user?.id);
                setActiveGroupIndex(actualIdx);
              } else {
                // Otherwise upload
                handlePlusClick();
              }
            }}
            className={`w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#FE2C55]/20 to-[#25F4EE]/20 flex items-center justify-center border border-white/20 cursor-pointer ${
              myGroup && !myGroup.stories.every(s => s.is_viewed) ? 'ring-2 ring-[#FE2C55] ring-offset-2 ring-offset-black' : ''
            }`}
          >
            {user?.profile_pic_url ? (
              <img
                src={mediaUrl(user.profile_pic_url)}
                alt="My profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 text-white font-bold flex items-center justify-center text-lg">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Plus Button Overlay */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlusClick();
            }}
            className="absolute bottom-0 right-0 w-5.5 h-5.5 bg-[#FE2C55] hover:bg-[#e0243c] active:scale-90 transition-all rounded-full flex items-center justify-center text-white border-2 border-black"
          >
            <Plus size={12} className="stroke-[3]" />
          </button>
        </div>
        <span className="text-xs text-white/50 max-w-[70px] truncate text-center">
          Story Saya
        </span>
      </div>

      {/* Divider */}
      {otherGroups.length > 0 && (
        <div className="w-[1px] h-12 bg-white/10 shrink-0 mx-1" />
      )}

      {/* Others' Story Rings */}
      {otherGroups.map((group) => {
        // Find actual index in entire feed
        const indexInFeed = feed.findIndex((g) => g.user_id === group.user_id);
        return (
          <StoryRing
            key={group.user_id}
            group={group}
            onClick={() => setActiveGroupIndex(indexInFeed)}
          />
        );
      })}

      {/* Fullscreen Story Viewer Modal */}
      <AnimatePresence>
        {activeGroupIndex !== null && feed[activeGroupIndex] && (
          <StoryViewer
            group={feed[activeGroupIndex]}
            onClose={() => {
              setActiveGroupIndex(null);
              fetchFeed(); // Refresh viewed states
            }}
            onNextUser={handleNextUser}
            onPrevUser={handlePrevUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
