'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Post } from '@/types';
import { useFeedStore, useAuthStore } from '@/store';
import SidebarInteract from './SidebarInteract';
import BottomInfo from './BottomInfo';
import MuteButton from './MuteButton';
import { mediaUrl, createReply, getPost } from '@/services/api';
import VideoPlayer from './VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';

interface PostCardProps {
  post: Post;
  index: number;
  isActive: boolean;
  onVisible: (index: number) => void;
}

// Determine if a URL is a video file
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url);
}

// Determine post type
function getPostType(post: Post): 'video' | 'photo' | 'note' {
  if (!post.media || post.media.length === 0) return 'note';
  if (isVideoUrl(post.media[0])) return 'video';
  return 'photo';
}

// Note background gradients — cycle based on post id
const NOTE_GRADIENTS = [
  'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
  'from-[#2d1b69] via-[#11998e] to-[#38ef7d]',
  'from-[#360033] via-[#0b8793] to-[#360033]',
  'from-[#200122] via-[#6f0000] to-[#200122]',
  'from-[#0f0c29] via-[#302b63] to-[#24243e]',
  'from-[#1f4037] via-[#99f2c8] to-[#1f4037]',
  'from-[#2c3e50] via-[#fd746c] to-[#2c3e50]',
];

export default function PostCard({ post, index, isActive, onVisible }: PostCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isMuted } = useFeedStore();
  const { isAuthenticated, user } = useAuthStore();
  const postType = getPostType(post);

  // Comment drawer state
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [localReplies, setLocalReplies] = useState<{ id: number; content: string; username: string }[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // IntersectionObserver: detect when > 75% in viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
          onVisible(index);
        }
      },
      { threshold: 0.75 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onVisible]);

  const gradient = NOTE_GRADIENTS[post.id % NOTE_GRADIENTS.length];

  // Fetch comments when drawer opens
  useEffect(() => {
    if (showComments && localReplies.length === 0 && post.reply_count > 0) {
      setIsLoadingComments(true);
      getPost(post.id).then(res => {
        if (res.success && res.data.replies) {
          setLocalReplies(res.data.replies.map(r => ({
            id: r.id,
            content: r.content || '',
            username: r.username,
          })));
        }
      }).finally(() => setIsLoadingComments(false));
    }
  }, [showComments, post.id, post.reply_count]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendComment = async () => {
    if (!commentInput.trim() || isSendingComment || !isAuthenticated) return;
    const content = commentInput.trim();
    setCommentInput('');
    setIsSendingComment(true);
    // Optimistic
    setLocalReplies(prev => [...prev, {
      id: Date.now(),
      content,
      username: user?.username || 'Me',
    }]);
    try {
      await createReply(post.id, content);
    } catch {}
    setIsSendingComment(false);
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full h-full snap-start flex-shrink-0 overflow-hidden bg-black"
    >
      {/* ── BACKGROUND LAYER ── */}

      {postType === 'video' && (
        <VideoPlayer
          src={post.media[0]}
          mediaUrls={post.media}
          isActive={isActive}
          isMuted={isMuted}
        />
      )}

      {postType === 'photo' && (
        <PhotoBackground media={post.media} />
      )}

      {postType === 'note' && (
        <NoteBackground gradient={gradient} content={post.content} />
      )}

      {/* ── GRADIENT OVERLAYS ── */}
      {postType !== 'note' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 pointer-events-none" />
        </>
      )}
      {postType === 'note' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      )}

      {/* ── MUTE button (only for video) ── */}
      {postType === 'video' && (
        <div className="absolute top-16 right-4 z-20">
          <MuteButton />
        </div>
      )}

      {/* ── BOTTOM: info + sidebar ── */}
      <div className="absolute bottom-0 left-0 right-0 pb-6 px-4 pt-4 flex items-end gap-3 z-10">

        <div className="flex-1 pb-2">
          <BottomInfo post={post} />
        </div>
        <div className="shrink-0">
          <SidebarInteract
            post={post}
            onComment={() => setShowComments(true)}
          />
        </div>
      </div>

      {/* ── COMMENT DRAWER — rendered fixed to escape overflow:hidden ── */}
      <AnimatePresence>
        {showComments && (
          <>
            {/* Backdrop — fixed, above BottomNav */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />

            {/* Sheet — fixed, slides up from viewport bottom */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-[#111] rounded-t-3xl border-t border-white/10 flex flex-col" style={{ maxHeight: '70vh' }}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
                <h3 className="text-white font-bold text-lg">{post.reply_count + localReplies.length} Komentar</h3>
                <button onClick={() => setShowComments(false)} className="text-white/60 hover:text-white p-1">
                  <X size={22} />
                </button>
              </div>

              {/* Comment list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {isLoadingComments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-white/50" size={24} />
                  </div>
                ) : localReplies.length === 0 && post.reply_count === 0 ? (
                  <p className="text-white/30 text-sm text-center py-8">
                    Belum ada komentar. Jadilah yang pertama! 💬
                  </p>
                ) : null}
                {localReplies.map(r => (
                  <div key={r.id} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {r.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-sm px-4 py-2.5">
                      <p className="text-[#FE2C55] text-xs font-semibold mb-1">@{r.username}</p>
                      <p className="text-white text-sm leading-relaxed">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#111]">
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <input
                      type="text"
                      placeholder="Tulis komentar..."
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      className="flex-1 bg-white/8 border border-white/15 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-[#FE2C55]/50 transition-colors"
                    />
                    <motion.button
                      onClick={handleSendComment}
                      disabled={!commentInput.trim() || isSendingComment}
                      whileTap={{ scale: 0.9 }}
                      className="w-11 h-11 bg-[#FE2C55] rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all shrink-0"
                    >
                      {isSendingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-white/50 text-sm text-center py-2">
                    <button onClick={() => { setShowComments(false); }} className="text-[#FE2C55] font-semibold">Login</button> untuk berkomentar
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Photo background with swipeable carousel feel ──
function PhotoBackground({ media }: { media: string[] }) {
  const first = mediaUrl(media[0]);
  return (
    <div className="w-full h-full relative">
      {/* Blurred background for letterboxed images */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-60"
        style={{ backgroundImage: `url(${first})` }}
      />
      {/* Main image */}
      <img
        src={first}
        alt="Post photo"
        className="relative w-full h-full object-contain"
      />
      {/* Multiple photos indicator */}
      {media.length > 1 && (
        <div className="absolute top-20 right-3 flex flex-col gap-1">
          {media.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Note / text post background ──
function NoteBackground({ gradient, content }: { gradient: string; content?: string }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-8`}>
      {/* Decorative circles */}
      <div className="absolute top-16 right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute bottom-32 left-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />

      {/* Note card */}
      <div className="relative w-full max-w-xs bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
        {/* Quote marks */}
        <div className="text-white/20 text-6xl font-serif leading-none mb-2 select-none">"</div>
        {content ? (
          <p className="text-white text-xl font-medium leading-relaxed text-center">
            {content}
          </p>
        ) : (
          <p className="text-white/40 text-lg italic text-center">No caption</p>
        )}
        <div className="text-white/20 text-6xl font-serif leading-none mt-2 text-right select-none">"</div>
      </div>
    </div>
  );
}
