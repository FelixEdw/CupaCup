'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronDown, ChevronUp } from 'lucide-react';
import { Post } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { getUserProfile, toggleFollow, mediaUrl } from '@/services/api';

interface BottomInfoProps {
  post: Post;
}

export default function BottomInfo({ post }: BottomInfoProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isMyPost = user?.id === post.user_id;

  useEffect(() => {
    if (isAuthenticated && !isMyPost) {
      getUserProfile(post.username).then(res => {
        if (res.success) {
          setIsFollowing(Boolean(res.data.is_following));
        }
      });
    }
  }, [post.username, isAuthenticated, isMyPost]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) { router.push('/login'); return; }
    setIsFollowLoading(true);
    try {
      const res = await toggleFollow(post.user_id);
      if (res.success) {
        setIsFollowing(res.data.action === 'followed');
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const caption = post.content || '';
  const isLong = caption.length > 80;
  const displayCaption = !expanded && isLong ? caption.slice(0, 80) + '...' : caption;

  // Dummy music track (posts don't have a music field in this backend)
  const musicTrack = `${post.full_name} - Original Sound`;

  return (
    <div className="flex flex-col gap-2 max-w-[calc(100%-80px)]">
      {/* Username + Profile Ring + Follow Button Row */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Profile Ring (Avatar) on the left */}
        <Link
          href={`/profile/${post.username}`}
          className="relative w-8 h-8 rounded-full overflow-hidden border border-white/40 cursor-pointer shadow-md shrink-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        >
          {post.profile_pic_url ? (
            <img
              src={mediaUrl(post.profile_pic_url)}
              alt={post.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
              {post.username.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Username */}
        <Link
          href={`/profile/${post.username}`}
          className="font-bold text-white text-[15px] hover:underline truncate max-w-[130px] sm:max-w-[200px]"
        >
          @{post.username}
        </Link>

        {/* Follow Button next to username */}
        {!isMyPost && (
          <button
            onClick={handleFollow}
            disabled={isFollowLoading}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-md shrink-0 ${
              isFollowing
                ? 'border border-white/30 text-white/80 hover:bg-white/10'
                : 'bg-[#FE2C55] text-white hover:bg-[#e0243c]'
            }`}
          >
            {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <div className="text-white/90 text-sm leading-relaxed">
          <span>{displayCaption}</span>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1 text-white/60 hover:text-white transition-colors inline-flex items-center gap-0.5"
            >
              {expanded ? (
                <>
                  less <ChevronUp size={14} />
                </>
              ) : (
                <>
                  more <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Music ticker */}
      <div className="flex items-center gap-2 overflow-hidden">
        <Music2 size={14} className="text-white shrink-0" />
        <div className="overflow-hidden flex-1">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="whitespace-nowrap text-white/80 text-xs"
          >
            {musicTrack} &nbsp;&nbsp;&nbsp; {musicTrack} &nbsp;&nbsp;&nbsp;
          </motion.div>
        </div>
      </div>

      {/* Repost indicator */}
      {post.rp_id && (
        <div className="flex items-center gap-1 text-white/60 text-xs">
          <span>🔁</span>
          <span>Reposted from @{post.rp_username}</span>
        </div>
      )}
    </div>
  );
}
