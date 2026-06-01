'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MessageCircle, Repeat2, Share2, Bookmark, Loader2, Send, X, Search, Trash2 } from 'lucide-react';
import { getPost, toggleLike, repost as repostApi, toggleSave, createReply, searchUsers, startConversation, sendMessage, getConversations, deletePost } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { useAuthStore, useFeedStore } from '@/store';
import { Post, User, Conversation } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url);
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.id);
  const { isAuthenticated, user } = useAuthStore();
  const { optimisticLike, removePost } = useFeedStore();

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isReposted, setIsReposted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Share modal state
  const [showShare, setShowShare] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [shareResults, setShareResults] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSending, setIsSending] = useState<number | null>(null);
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchPost = useCallback(async () => {
    const res = await getPost(postId);
    if (res.success) {
      setPost(res.data.post);
      setReplies(res.data.replies);
      setIsReposted(Boolean(res.data.post.is_reposted));
    }
    setIsLoading(false);
  }, [postId]);

  const handleDeletePost = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus post ini?')) return;
    setIsDeleting(true);
    try {
      const res = await deletePost(postId);
      if (res.success) {
        removePost(postId);
        router.back();
      } else {
        alert(res.message || 'Gagal menghapus post.');
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus post.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleLike = async (p: Post) => {
    if (!isAuthenticated) { router.push('/login'); return; }
    const wasLiked = Boolean(p.is_liked);
    setPost(prev => prev ? {
      ...prev,
      is_liked: wasLiked ? 0 : 1,
      like_count: wasLiked ? prev.like_count - 1 : prev.like_count + 1,
    } : null);
    try { await toggleLike(p.id); } catch {
      setPost(prev => prev ? {
        ...prev,
        is_liked: wasLiked ? 1 : 0,
        like_count: wasLiked ? prev.like_count + 1 : prev.like_count - 1,
      } : null);
    }
  };

  const handleRepost = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!post) return;
    const was = isReposted;
    setIsReposted(!was);
    setPost(prev => prev ? { ...prev, repost_count: was ? Math.max(0, prev.repost_count - 1) : prev.repost_count + 1 } : null);
    try { await repostApi(post.id); } catch {
      setIsReposted(was);
      setPost(prev => prev ? { ...prev, repost_count: was ? prev.repost_count + 1 : Math.max(0, prev.repost_count - 1) } : null);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!post) return;
    const was = isSaved;
    setIsSaved(!was);
    try { await toggleSave(post.id); } catch { setIsSaved(was); }
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || isSendingComment || !isAuthenticated || !post) return;
    const content = commentInput.trim();
    setCommentInput('');
    setIsSendingComment(true);
    // Optimistic reply
    const optimistic: Post = {
      id: Date.now(),
      content,
      reply_count: 0,
      repost_count: 0,
      like_count: 0,
      created_at: new Date().toISOString(),
      user_id: user!.id,
      username: user!.username,
      full_name: user!.full_name,
      profile_pic_url: user?.profile_pic_url,
      media: [],
    };
    setReplies(prev => [optimistic, ...prev]);
    setPost(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);
    try { await createReply(post.id, content); } catch {}
    setIsSendingComment(false);
  };

  // Share functionality
  const openShare = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setShowShare(true);
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
    if (isSending !== null || !post) return;
    setIsSending(recipientId);
    try {
      const convRes = await startConversation(recipientId);
      if (convRes.success) {
        const shareText = `📌 Post dari @${post.username}: "${post.content?.slice(0, 80) || '(tanpa teks)'}..."`;
        await sendMessage(convRes.data.id, shareText, post.repost_id || post.id);
        setSentTo(prev => new Set([...prev, recipientId]));
      }
    } catch {}
    setIsSending(null);
  };

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
  const fmtTime = (s: string) => formatDistanceToNow(new Date(s), { addSuffix: true, locale: id });

  const suggestions = shareSearch ? shareResults : conversations.map(c => ({
    id: c.other_user_id,
    username: c.username,
    full_name: c.full_name,
    profile_pic_url: c.profile_pic_url,
  } as User));

  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-[#FE2C55] animate-spin" size={36} />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/60 text-lg">Post tidak ditemukan</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white hover:text-white/70 p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white font-bold text-xl">Post</h1>
        {user?.id === post.user_id && (
          <button
            onClick={handleDeletePost}
            disabled={isDeleting}
            className="ml-auto text-red-500 hover:text-red-400 p-1 flex items-center gap-1.5 font-semibold text-sm transition-all"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            Hapus
          </button>
        )}
      </div>

      {/* Main post */}
      <div className="p-5 border-b border-white/10">
        {/* Author */}
        <Link href={`/profile/${post.username}`} className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full overflow-hidden">
            {post.profile_pic_url ? (
              <img src={mediaUrl(post.profile_pic_url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                {post.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-base">{post.full_name}</p>
            <p className="text-white/50 text-sm">@{post.username} · {fmtTime(post.created_at)}</p>
          </div>
        </Link>

        {post.content && (
          <p className="text-white text-lg leading-relaxed mb-4">{post.content}</p>
        )}

        {/* Media */}
        {post.media?.length > 0 && (
          <div className={`grid gap-3 mb-4 rounded-xl overflow-hidden ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.media.map((url, i) => {
              const isVid = isVideoUrl(url);
              return isVid ? (
                <video
                  key={i}
                  src={mediaUrl(url)}
                  className="w-full rounded-xl object-contain max-h-[60vh] bg-zinc-950 border border-white/5 shadow-inner"
                  controls
                  playsInline
                />
              ) : (
                <img
                  key={i}
                  src={mediaUrl(url)}
                  alt=""
                  className="w-full object-cover rounded-xl max-h-[60vh] border border-white/5 shadow"
                />
              );
            })}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-5 py-4 border-t border-white/10">
          {/* Comment */}
          <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <MessageCircle size={22} />
            <span className="text-base font-medium">{fmtNum(post.reply_count)}</span>
          </button>

          {/* Repost */}
          <motion.button
            onClick={handleRepost}
            whileTap={{ scale: 0.88 }}
            className={`flex items-center gap-2 transition-colors ${
              isReposted ? 'text-green-400' : 'text-white/60 hover:text-green-400'
            }`}
          >
            <Repeat2 size={22} />
            <span className="text-base font-medium">{fmtNum(post.repost_count)}</span>
          </motion.button>

          {/* Like */}
          <motion.button
            onClick={() => handleLike(post)}
            whileTap={{ scale: 0.85 }}
            className={`flex items-center gap-2 transition-colors ${
              post.is_liked ? 'text-[#FE2C55]' : 'text-white/60 hover:text-[#FE2C55]'
            }`}
          >
            <Heart size={22} className={post.is_liked ? 'fill-[#FE2C55]' : ''} />
            <span className="text-base font-medium">{fmtNum(post.like_count)}</span>
          </motion.button>

          <div className="flex-1" />

          {/* Save/Bookmark */}
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: 0.88 }}
            className={`transition-colors ${
              isSaved ? 'text-yellow-400' : 'text-white/60 hover:text-yellow-400'
            }`}
          >
            <Bookmark size={22} className={isSaved ? 'fill-yellow-400' : ''} />
          </motion.button>

          {/* Share */}
          <motion.button
            onClick={openShare}
            whileTap={{ scale: 0.88 }}
            className="text-white/60 hover:text-white transition-colors"
          >
            <Share2 size={22} />
          </motion.button>
        </div>
      </div>

      {/* Comment input */}
      <div className="px-5 py-4 border-b border-white/10 bg-black sticky top-[65px] z-20">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <input
              type="text"
              placeholder="Tulis balasan..."
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              className="flex-1 bg-white/8 border border-white/15 rounded-full px-5 py-3 text-white text-base placeholder-white/30 outline-none focus:border-[#FE2C55]/50 transition-colors"
            />
            <motion.button
              onClick={handleSendComment}
              disabled={!commentInput.trim() || isSendingComment}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 bg-[#FE2C55] rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all shrink-0"
            >
              {isSendingComment ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </motion.button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 border border-white/20 rounded-full text-white/60 hover:text-white hover:border-white/40 transition-colors text-base"
          >
            Login untuk membalas...
          </button>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div>
          <p className="px-5 py-3 text-white/50 text-sm uppercase tracking-wider border-b border-white/10">
            {replies.length} Balasan
          </p>
          {replies.map((reply) => (
            <div key={reply.id} className="p-5 border-b border-white/10">
              <Link href={`/profile/${reply.username}`} className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full overflow-hidden">
                  {reply.profile_pic_url ? (
                    <img src={mediaUrl(reply.profile_pic_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold">
                      {reply.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-white font-semibold text-base">{reply.full_name}</span>
                  <span className="text-white/40 text-sm ml-2">· {fmtTime(reply.created_at)}</span>
                </div>
              </Link>
              <p className="text-white/90 text-base ml-14">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Share to DM Modal */}
      <AnimatePresence>
        {showShare && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-3xl border-t border-white/10 max-h-[75vh] flex flex-col"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h3 className="text-white font-bold text-lg">Bagikan ke Chat</h3>
                <button onClick={() => setShowShare(false)} className="text-white/60 hover:text-white p-1">
                  <X size={22} />
                </button>
              </div>
              <div className="mx-4 mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/70 text-xs mb-1">@{post.username}</p>
                <p className="text-white text-sm line-clamp-2">{post.content || '(media post)'}</p>
              </div>
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
              <div className="flex-1 overflow-y-auto px-3 pb-8">
                {suggestions.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-8">
                    {shareSearch ? 'Tidak ada hasil' : 'Cari pengguna untuk kirim'}
                  </p>
                )}
                {suggestions.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
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
                      ) : sentTo.has(u.id) ? 'Terkirim' : (
                        <><Send size={14} />Kirim</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
