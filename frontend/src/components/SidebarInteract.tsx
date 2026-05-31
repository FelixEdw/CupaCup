'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Heart, MessageCircle, Repeat2, Share2, Bookmark, X, Search, Send, Loader2 } from 'lucide-react';
import { Post, User, Conversation } from '@/types';
import { useAuthStore, useFeedStore } from '@/store';
import { toggleLike, repost, toggleSave, searchUsers, startConversation, sendMessage, getConversations, mediaUrl } from '@/services/api';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SidebarInteractProps {
  post: Post;
  onComment?: () => void;
}

export default function SidebarInteract({ post, onComment }: SidebarInteractProps) {
  const { isAuthenticated, user } = useAuthStore();
  const { optimisticLike } = useFeedStore();
  const router = useRouter();

  const [bookmarked, setBookmarked] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [isReposted, setIsReposted] = useState(Boolean(post.is_reposted));
  const [repostCount, setRepostCount] = useState(post.repost_count);
  const [isRepostLoading, setIsRepostLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  // Share modal state
  const [showShare, setShowShare] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [shareResults, setShareResults] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSending, setIsSending] = useState<number | null>(null);
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const isLiked = Boolean(post.is_liked);

  const handleLike = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    optimisticLike(post.id);
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 300);
    try {
      await toggleLike(post.id);
    } catch {
      optimisticLike(post.id);
    }
  };

  const handleRepost = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (isRepostLoading) return;
    setIsRepostLoading(true);
    const wasReposted = isReposted;
    setIsReposted(!wasReposted);
    setRepostCount(c => wasReposted ? Math.max(0, c - 1) : c + 1);
    try {
      await repost(post.repost_id || post.id);
    } catch {
      setIsReposted(wasReposted);
      setRepostCount(c => wasReposted ? c + 1 : Math.max(0, c - 1));
    } finally {
      setIsRepostLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (isSaveLoading) return;
    setIsSaveLoading(true);
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    try {
      await toggleSave(post.id);
    } catch {
      setBookmarked(wasBookmarked);
    } finally {
      setIsSaveLoading(false);
    }
  };

  const openShare = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setShowShare(true);
    // Load conversations to show as suggestions
    const res = await getConversations();
    if (res.success) setConversations(res.data);
  };

  const handleShareSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setShareResults([]); return; }
    const res = await searchUsers(q);
    if (res.success) setShareResults(res.data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleShareSearch(shareSearch), 350);
    return () => clearTimeout(t);
  }, [shareSearch, handleShareSearch]);

  const handleSendShare = async (recipientId: number) => {
    if (isSending !== null) return;
    setIsSending(recipientId);
    try {
      const convRes = await startConversation(recipientId);
      if (convRes.success) {
        const shareText = `📌 Membagikan post dari @${post.username}`;
        await sendMessage(convRes.data.id, shareText, post.repost_id || post.id);
        setSentTo(prev => new Set([...prev, recipientId]));
      }
    } catch {}
    setIsSending(null);
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const isMyPost = user?.id === post.user_id;

  // Suggestions = existing conversations (people you already talk to)
  const suggestions = shareSearch ? shareResults : conversations.map(c => ({
    id: c.other_user_id,
    username: c.username,
    full_name: c.full_name,
    profile_pic_url: c.profile_pic_url,
  } as User));

  return (
    <>
      <div className="flex flex-col items-center gap-4 pb-20">
        {/* Avatar with follow indicator */}
        <div className="relative">
          <div
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-2 ring-transparent cursor-pointer"
            onClick={() => router.push(`/profile/${post.username}`)}
          >
            {post.profile_pic_url ? (
              <img
                src={mediaUrl(post.profile_pic_url)}
                alt={post.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                {post.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {!isMyPost && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#FE2C55] rounded-full flex items-center justify-center shadow-lg border-2 border-black">
              <span className="text-white text-sm font-bold leading-none">+</span>
            </div>
          )}
        </div>

        {/* Like */}
        <motion.button
          onClick={handleLike}
          className="flex flex-col items-center gap-1.5 group"
          whileTap={{ scale: 0.85 }}
        >
          <AnimatePresence>
            <motion.div
              key={isLiked ? 'liked' : 'unliked'}
              initial={{ scale: likeAnim ? 1.5 : 1 }}
              animate={{ scale: 1 }}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isLiked
                  ? 'bg-[#FE2C55]/20'
                  : 'bg-black/30 group-hover:bg-white/10'
              }`}
            >
              <Heart
                size={30}
                className={isLiked ? 'text-[#FE2C55] fill-[#FE2C55]' : 'text-white'}
              />
            </motion.div>
          </AnimatePresence>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {formatCount(post.like_count)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          onClick={onComment}
          className="flex flex-col items-center gap-1.5 group"
          whileTap={{ scale: 0.85 }}
        >
          <div className="w-14 h-14 rounded-full bg-black/30 group-hover:bg-white/10 flex items-center justify-center transition-all">
            <MessageCircle size={30} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {formatCount(post.reply_count)}
          </span>
        </motion.button>

        {/* Repost */}
        <motion.button
          onClick={handleRepost}
          className="flex flex-col items-center gap-1.5 group"
          whileTap={{ scale: 0.85 }}
          disabled={isRepostLoading}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isReposted ? 'bg-green-500/20' : 'bg-black/30 group-hover:bg-white/10'
          }`}>
            <Repeat2 size={30} className={isReposted ? 'text-green-400' : 'text-white'} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">
            {formatCount(repostCount)}
          </span>
        </motion.button>

        {/* Bookmark / Save */}
        <motion.button
          onClick={handleSave}
          className="flex flex-col items-center gap-1.5 group"
          whileTap={{ scale: 0.85 }}
          disabled={isSaveLoading}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            bookmarked ? 'bg-yellow-500/20' : 'bg-black/30 group-hover:bg-white/10'
          }`}>
            <Bookmark
              size={30}
              className={bookmarked ? 'text-yellow-400 fill-yellow-400' : 'text-white'}
            />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">Save</span>
        </motion.button>

        {/* Share */}
        <motion.button
          onClick={openShare}
          className="flex flex-col items-center gap-1.5 group"
          whileTap={{ scale: 0.85 }}
        >
          <div className="w-14 h-14 rounded-full bg-black/30 group-hover:bg-white/10 flex items-center justify-center transition-all">
            <Share2 size={30} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-md">Share</span>
        </motion.button>

        {/* Music disc */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-4 border-gray-600 flex items-center justify-center shadow-lg"
        >
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
          </div>
        </motion.div>
      </div>

      {/* Share to DM Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showShare && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowShare(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="fixed bottom-0 left-0 right-0 z-[101] bg-[#111] rounded-t-3xl border-t border-white/10 max-h-[75vh] flex flex-col"
              >
                {/* Handle */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                  <h3 className="text-white font-bold text-lg">Bagikan ke Chat</h3>
                  <button onClick={() => setShowShare(false)} className="text-white/60 hover:text-white p-1">
                    <X size={22} />
                  </button>
                </div>

                {/* Post preview */}
                <div className="mx-4 mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white/70 text-xs mb-1">@{post.username}</p>
                  <p className="text-white text-sm line-clamp-2">{post.content || '(media post)'}</p>
                </div>

                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-2.5">
                    <Search size={16} className="text-white/40" />
                    <input
                      type="text"
                      placeholder="Cari pengguna..."
                      value={shareSearch}
                      onChange={e => setShareSearch(e.target.value)}
                      className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto px-3 pb-8">
                  {suggestions.length === 0 && (
                    <p className="text-white/30 text-sm text-center py-8">
                      {shareSearch ? 'Tidak ada hasil' : 'Cari pengguna untuk kirim pesan'}
                    </p>
                  )}
                  {suggestions.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                        {u.profile_pic_url ? (
                          <img src={mediaUrl(u.profile_pic_url)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{u.full_name}</p>
                        <p className="text-white/40 text-xs truncate">@{u.username}</p>
                      </div>
                      <button
                        onClick={() => handleSendShare(u.id)}
                        disabled={sentTo.has(u.id) || isSending === u.id}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                          sentTo.has(u.id)
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-[#FE2C55] text-white hover:bg-[#e0243c]'
                        }`}
                      >
                        {isSending === u.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : sentTo.has(u.id) ? (
                          'Terkirim'
                        ) : (
                          <>
                            <Send size={14} />
                            Kirim
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
