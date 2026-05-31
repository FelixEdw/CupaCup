'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronDown, ChevronUp } from 'lucide-react';
import { Post } from '@/types';
import Link from 'next/link';

interface BottomInfoProps {
  post: Post;
}

export default function BottomInfo({ post }: BottomInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const caption = post.content || '';
  const isLong = caption.length > 80;
  const displayCaption = !expanded && isLong ? caption.slice(0, 80) + '...' : caption;

  // Dummy music track (posts don't have a music field in this backend)
  const musicTrack = `${post.full_name} - Original Sound`;

  return (
    <div className="flex flex-col gap-2 max-w-[calc(100%-80px)]">
      {/* Username */}
      <Link
        href={`/profile/${post.username}`}
        className="font-bold text-white text-[15px] hover:underline w-fit"
      >
        @{post.username}
      </Link>

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
