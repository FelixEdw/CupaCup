'use client';

import { StoryGroup } from '@/types';
import { mediaUrl } from '@/services/api';

interface StoryRingProps {
  group: StoryGroup;
  onClick: () => void;
}

export default function StoryRing({ group, onClick }: StoryRingProps) {
  // Check if all stories in this group are viewed
  const allViewed = group.stories.every((s) => s.is_viewed);

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
    >
      {/* Outer Ring Wrapper */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center p-[2.5px] transition-all duration-300 ${
          allViewed
            ? 'bg-white/20 hover:scale-105'
            : 'bg-gradient-to-tr from-[#FE2C55] via-purple-500 to-[#25F4EE] hover:scale-105 active:scale-95'
        }`}
      >
        {/* Inner Black Divider */}
        <div className="w-full h-full rounded-full bg-black flex items-center justify-center p-[2px]">
          {/* Avatar Picture */}
          <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-lg select-none">
            {group.profile_pic_url ? (
              <img
                src={mediaUrl(group.profile_pic_url)}
                alt={group.username}
                className="w-full h-full object-cover"
              />
            ) : (
              group.username.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>

      {/* Username Caption */}
      <span className="text-xs text-white/70 max-w-[70px] truncate text-center font-medium">
        {group.username}
      </span>
    </div>
  );
}
