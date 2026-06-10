'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useFeedStore } from '@/store';
import {
  getAuthFeed,
  getPublicFeed,
  getCreators,
  getTrendingTags,
  getNotifications,
  toggleLike,
  repost,
  toggleSave,
  toggleFollow,
  startConversation,
  createReply,
  getPost,
  mediaUrl
} from '@/services/api';
import VideoPlayer from '@/components/VideoPlayer';
import {
  Search,
  Bell,
  Plus,
  RefreshCw,
  Zap,
  Award,
  ChevronLeft,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Sparkles,
  UserPlus,
  UserCheck,
  MessageCircle,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const POST_GRADIENTS = [
  'from-[#8a2387] via-[#e94057] to-[#f27121]',
  'from-[#11998e] to-[#38ef7d]',
  'from-[#fc00ff] to-[#00dbde]',
  'from-[#f4a261] to-[#e76f51]',
  'from-[#1f4037] to-[#99f2c8]',
  'from-[#0f0c29] via-[#302b63] to-[#24243e]'
];

const CREATOR_GRADIENTS = [
  'from-[#dd9c7f] via-[#c68265] to-[#ae6a4e]',
  'from-[#cca0b0] via-[#c6899f] to-[#aa6680]',
  'from-[#a2c4c9] via-[#85b5b9] to-[#60999d]',
  'from-[#e9c46a] via-[#e76f51] to-[#f4a261]',
  'from-[#e76f51] via-[#d65f42] to-[#b83d21]'
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Tab switching state: 'feed' or 'creators'
  const [feedTab, setFeedTab] = useState<'feed' | 'creators'>('feed');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [trendingTags, setTrendingTags] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Modal overlays
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTrendingTopics, setShowTrendingTopics] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Comment section states for active popup
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Wait for Zustand hydration
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setChecked(true);
      if (!useAuthStore.getState().isAuthenticated) {
        router.replace('/login');
      }
    });

    if (useAuthStore.persist.hasHydrated()) {
      setChecked(true);
      if (!useAuthStore.getState().isAuthenticated) {
        router.replace('/login');
      }
    }

    return () => unsub();
  }, [router]);

  // Fetch feed content dynamically from DB
  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load Feed Posts
      const feedRes = isAuthenticated ? await getAuthFeed() : await getPublicFeed();
      if (feedRes.success && feedRes.data) {
        const adaptedPosts = feedRes.data.map((post, idx) => ({
          ...post,
          gradient: POST_GRADIENTS[idx % POST_GRADIENTS.length]
        }));
        setPosts(adaptedPosts);
      } else {
        setPosts([]);
      }

      // 2. Load Creators (Users sorted by popular follower counts)
      const creatorsRes = await getCreators();
      if (creatorsRes.success && creatorsRes.data) {
        const adaptedCreators = creatorsRes.data.map((c, idx) => ({
          ...c,
          gradient: CREATOR_GRADIENTS[idx % CREATOR_GRADIENTS.length]
        }));
        setCreators(adaptedCreators);
      } else {
        setCreators([]);
      }

      // 3. Load Trending Tags calculated from actual posts
      const tagsRes = await getTrendingTags();
      if (tagsRes.success && tagsRes.data) {
        setTrendingTags(tagsRes.data);
      } else {
        setTrendingTags([]);
      }

      // 4. Load Notifications list
      if (isAuthenticated) {
        const notifRes = await getNotifications();
        if (notifRes.success && notifRes.data) {
          setNotifications(notifRes.data);
        } else {
          setNotifications([]);
        }
      }
    } catch (e) {
      console.error('[Home] loadContent error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (checked && isAuthenticated) {
      loadContent();
    }
  }, [checked, isAuthenticated, loadContent]);

  // Fetch comments dynamically for detail modal
  useEffect(() => {
    if (selectedPost && showComments) {
      setIsLoadingComments(true);
      getPost(selectedPost.id).then(res => {
        if (res.success && res.data.replies) {
          setComments(res.data.replies);
        }
      }).finally(() => setIsLoadingComments(false));
    }
  }, [selectedPost, showComments]);

  // Handle send comment in popup
  const handleSendComment = async () => {
    if (!commentInput.trim() || isSendingComment || !selectedPost) return;
    const content = commentInput.trim();
    setCommentInput('');
    setIsSendingComment(true);

    try {
      const res = await createReply(selectedPost.id, content);
      if (res.success) {
        // Re-fetch comments dynamically to keep list updated
        const postDetails = await getPost(selectedPost.id);
        if (postDetails.success && postDetails.data.replies) {
          setComments(postDetails.data.replies);
        }
        // Update reply count in posts list
        setPosts(prev => prev.map(p => {
          if (p.id !== selectedPost.id) return p;
          return { ...p, reply_count: p.reply_count + 1 };
        }));
        setSelectedPost((prev: any) => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingComment(false);
    }
  };

  // Handle interaction callbacks from popup
  const handleLike = async (postId: number) => {
    setPosts(prev => prev.map(d => {
      if (d.id !== postId) return d;
      const isLiked = d.is_liked ? 0 : 1;
      return {
        ...d,
        is_liked: isLiked,
        like_count: isLiked ? d.like_count + 1 : Math.max(0, d.like_count - 1)
      };
    }));

    if (selectedPost && selectedPost.id === postId) {
      const isLiked = selectedPost.is_liked ? 0 : 1;
      setSelectedPost({
        ...selectedPost,
        is_liked: isLiked,
        like_count: isLiked ? selectedPost.like_count + 1 : Math.max(0, selectedPost.like_count - 1)
      });
    }

    try {
      await toggleLike(postId);
    } catch {}
  };

  const handleRepost = async (postId: number) => {
    setPosts(prev => prev.map(d => {
      if (d.id !== postId) return d;
      const isRp = d.is_reposted ? 0 : 1;
      return {
        ...d,
        is_reposted: isRp,
        repost_count: isRp ? d.repost_count + 1 : Math.max(0, d.repost_count - 1)
      };
    }));

    if (selectedPost && selectedPost.id === postId) {
      const isRp = selectedPost.is_reposted ? 0 : 1;
      setSelectedPost({
        ...selectedPost,
        is_reposted: isRp,
        repost_count: isRp ? selectedPost.repost_count + 1 : Math.max(0, selectedPost.repost_count - 1)
      });
    }

    try {
      await repost(postId);
    } catch {}
  };

  const handleBookmark = async (postId: number) => {
    setPosts(prev => prev.map(d => {
      if (d.id !== postId) return d;
      const isSaved = d.is_saved ? 0 : 1;
      return { ...d, is_saved: isSaved };
    }));

    if (selectedPost && selectedPost.id === postId) {
      const isSaved = selectedPost.is_saved ? 0 : 1;
      setSelectedPost({
        ...selectedPost,
        is_saved: isSaved
      });
    }

    try {
      await toggleSave(postId);
    } catch {}
  };

  // Follow creator handler
  const handleFollowCreator = async (creatorId: number, username: string) => {
    setCreators(prev => prev.map(c => {
      if (c.id !== creatorId) return c;
      const isF = c.is_following ? 0 : 1;
      return {
        ...c,
        is_following: isF,
        followers_count: isF ? c.followers_count + 1 : Math.max(0, c.followers_count - 1)
      };
    }));

    if (selectedCreator && selectedCreator.id === creatorId) {
      const isF = selectedCreator.is_following ? 0 : 1;
      setSelectedCreator({
        ...selectedCreator,
        is_following: isF,
        followers_count: isF ? selectedCreator.followers_count + 1 : Math.max(0, selectedCreator.followers_count - 1)
      });
    }

    try {
      await toggleFollow(creatorId);
    } catch {}
  };

  // Message redirection
  const handleMessageCreator = async (creatorId: number) => {
    try {
      const res = await startConversation(creatorId);
      if (res.success && res.data) {
        router.push(`/messages`);
      }
    } catch {
      router.push('/messages');
    }
  };

  // Helper formatting for numbers
  const formatFollowers = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return count.toString();
  };

  // Open notifications panel & clear unread count
  const toggleNotifications = () => {
    setShowNotifications(prev => {
      const nextVal = !prev;
      if (nextVal) {
        // Mark notifications as read locally instantly for responsive UI feedback
        setNotifications(curr => curr.map(n => ({ ...n, is_read: 1 })));
      }
      return nextVal;
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!checked || !isAuthenticated) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Wavy lines SVG background component
  const AbstractLines = () => (
    <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.5" />
      <path d="M0,75 Q35,55 70,85 T100,65" fill="none" stroke="white" strokeWidth="0.3" />
      <path d="M0,25 Q15,10 45,35 T100,15" fill="none" stroke="white" strokeWidth="0.4" />
    </svg>
  );

  return (
    <div className="relative h-full flex flex-col bg-black text-white overflow-hidden select-none font-sans">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/5 shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FE2C55] to-[#25F4EE] flex items-center justify-center shadow-lg shadow-[#FE2C55]/20">
            <Sparkles size={18} className="text-white animate-pulse" />
          </div>
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-white/90 to-[#25F4EE] bg-clip-text text-transparent">CupaCup</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/explore')}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <Search size={20} />
          </button>
          <button
            onClick={toggleNotifications}
            className="relative w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FE2C55] text-[10px] font-extrabold flex items-center justify-center text-white border-2 border-black animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ─── MAIN SCROLL FEED ─── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-4">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-[#FE2C55]" size={36} />
            <p className="text-white/40 text-xs">Memuat feed terbaru...</p>
          </div>
        ) : feedTab === 'feed' ? (
          /* ── SOCIAL POSTS FEED (2x2 style cards layout) ── */
          posts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-2 px-6">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-bold text-white/80">Belum ada postingan</p>
              <p className="text-xs text-white/40">Buat postingan pertamamu dengan mengetuk tombol "+"!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {posts.map((post) => {
                const hasMedia = post.media && post.media.length > 0;
                const mediaFile = hasMedia ? post.media[0] : null;
                const isVideo = mediaFile ? /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(mediaFile) : false;

                return (
                  <motion.div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative h-60 rounded-3xl bg-[#121212] flex flex-col justify-between overflow-hidden shadow-xl cursor-pointer group"
                  >
                    {/* ── BACKGROUND LAYER (Dynamic Image/Video Preview) ── */}
                    {hasMedia ? (
                      <>
                        {isVideo ? (
                          <video
                            src={mediaUrl(mediaFile)}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 w-full h-full object-cover z-0"
                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                          />
                        ) : (
                          <img
                            src={mediaUrl(mediaFile)}
                            alt={post.content || 'Post media'}
                            className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/55 z-10 pointer-events-none" />
                      </>
                    ) : (
                      <>
                        <div className={`absolute inset-0 bg-gradient-to-br ${post.gradient || 'from-[#121212] to-[#242424]'} z-0`} />
                        <AbstractLines />
                      </>
                    )}

                    {/* Creator Top bar */}
                    <div className="flex items-center gap-2 z-20 p-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
                        {post.profile_pic_url ? (
                          <img src={mediaUrl(post.profile_pic_url)} alt={post.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs">
                            {post.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate drop-shadow-md">@{post.username}</p>
                        <p className="text-[9px] text-white/70 truncate drop-shadow-sm">
                          {post.followers_count ? formatFollowers(post.followers_count) : '0'} pengikut
                        </p>
                      </div>
                    </div>

                    {/* Main Post Content */}
                    <div className="my-auto z-20 px-4">
                      <p className="text-sm font-extrabold text-white leading-snug tracking-tight drop-shadow-md line-clamp-3">
                        {post.content || (isVideo ? '🎥 Video' : '🖼️ Foto')}
                      </p>
                    </div>

                    {/* Bottom Stats / Footer */}
                    <div className="z-20 px-4 pb-4 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/80 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5">
                        {hasMedia ? (isVideo ? '🎥 Video' : '🖼️ Foto') : '✍️ Cuapan'}
                      </span>
                      <div className="flex items-center gap-1.5 text-white/80 text-xs drop-shadow-sm font-bold">
                        <Heart size={11} className={post.is_liked ? 'text-[#FE2C55] fill-[#FE2C55]' : ''} />
                        <span>{post.like_count >= 1000 ? (post.like_count / 1000).toFixed(1) + 'k' : post.like_count}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* ── TREND CREATORS (Featured top, 2x2 grid below) ── */
          creators.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-2 px-6">
              <span className="text-4xl">👥</span>
              <p className="text-sm font-bold text-white/80">Belum ada kreator</p>
              <p className="text-xs text-white/40">Daftarkan akun lain untuk memunculkan ranking kreator!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Featured top card (Highest follower count) */}
              {creators[0] && (
                <motion.div
                  onClick={() => setSelectedCreator(creators[0])}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`relative w-full h-52 rounded-3xl bg-gradient-to-br ${creators[0].gradient || 'from-amber-600 to-amber-900'} p-5 flex flex-col justify-between overflow-hidden shadow-2xl cursor-pointer`}
                >
                  <AbstractLines />

                  {/* Profile Circle Top Left */}
                  <div className="flex items-start gap-4 z-10">
                    <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-white/30 shadow-md">
                      {creators[0].profile_pic_url ? (
                        <img src={mediaUrl(creators[0].profile_pic_url)} alt={creators[0].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-black/40 flex items-center justify-center font-bold text-lg">
                          {creators[0].username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="pt-1">
                      <h3 className="text-xl font-extrabold text-white tracking-tight">{creators[0].full_name}</h3>
                      <p className="text-white/60 text-sm">@{creators[0].username}</p>
                      <p className="text-white/80 text-xs font-bold mt-1 bg-black/30 backdrop-blur-sm inline-block px-2.5 py-0.5 rounded-full border border-white/5">
                        🔥 Kreator Utama
                      </p>
                    </div>
                  </div>

                  {/* Follower Stats Bottom */}
                  <div className="flex items-center justify-between z-10">
                    <div>
                      <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">Total Pengikut</p>
                      <p className="text-2xl font-black text-white leading-none mt-0.5">
                        {formatFollowers(creators[0].followers_count || 0)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowCreator(creators[0].id, creators[0].username);
                      }}
                      className={`px-5 py-2.5 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 ${
                        creators[0].is_following
                          ? 'bg-white/15 text-white border border-white/10'
                          : 'bg-white text-black hover:bg-white/95'
                      }`}
                    >
                      {creators[0].is_following ? 'Mengikuti' : 'Ikuti'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Grid 2x2 creators below */}
              {creators.length > 1 && (
                <div className="grid grid-cols-2 gap-3.5">
                  {creators.slice(1).map((creator) => (
                    <motion.div
                      key={creator.id}
                      onClick={() => setSelectedCreator(creator)}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative h-48 rounded-3xl bg-gradient-to-br ${creator.gradient || 'from-[#1f1f1f] to-[#3a3a3a]'} p-4 flex flex-col justify-between overflow-hidden shadow-lg cursor-pointer`}
                    >
                      <AbstractLines />

                      <div className="flex flex-col items-center text-center z-10 mt-1">
                        <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-white/20 shadow-md">
                          {creator.profile_pic_url ? (
                            <img src={mediaUrl(creator.profile_pic_url)} alt={creator.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-black/40 flex items-center justify-center font-bold text-sm">
                              {creator.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white mt-2 leading-none max-w-full truncate">{creator.full_name}</h4>
                        <p className="text-[10px] text-white/50 mt-0.5 truncate max-w-full">@{creator.username}</p>
                      </div>

                      <div className="flex flex-col items-center z-10 border-t border-white/5 pt-1.5">
                        <p className="text-[10px] text-white/60 font-semibold">
                          👤 {formatFollowers(creator.followers_count || 0)} pengikut
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* ─── FLOATING "+" CREATE BUTTON ─── */}
      <div className="absolute bottom-6 left-6 z-20">
        <motion.button
          onClick={() => router.push('/create')}
          whileHover={{ scale: 1.06, rotate: 90 }}
          whileTap={{ scale: 0.92 }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FE2C55] to-[#f85f7f] flex items-center justify-center text-white shadow-lg shadow-[#FE2C55]/40 border-2 border-black"
        >
          <Plus size={26} strokeWidth={3} />
        </motion.button>
      </div>

      {/* ─── BOTTOM NAVIGATION TABS (Feed & Trend Creators) ─── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-1 bg-[#111]/90 backdrop-blur-lg px-2.5 py-1.5 rounded-full border border-white/10 shadow-2xl">
          <button
            onClick={() => setFeedTab('feed')}
            className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all active:scale-95 ${
              feedTab === 'feed' ? 'bg-[#FE2C55] text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setFeedTab('creators')}
            className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all active:scale-95 ${
              feedTab === 'creators' ? 'bg-[#FE2C55] text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            Trend Creators
          </button>
        </div>
      </div>

      {/* ─── FLOATING ACTION BUTTONS STACK (BOTTOM RIGHT) ─── */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3 items-center">
        {/* Refresh feed */}
        <motion.button
          onClick={loadContent}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 hover:border-white/30 shadow-lg active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
        </motion.button>

        {/* Lightning bolt (Trending Hashtags) */}
        <motion.button
          onClick={() => setShowTrendingTopics(true)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-amber-400 hover:bg-black/80 hover:border-white/30 shadow-lg active:scale-95 transition-all"
        >
          <Zap size={18} fill="currentColor" />
          {trendingTags.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-[9px] font-black text-black border-2 border-black flex items-center justify-center animate-pulse">
              {trendingTags.length}
            </span>
          )}
        </motion.button>

        {/* Leaderboard star ribbon */}
        <motion.button
          onClick={() => setShowLeaderboard(true)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-[#25F4EE] hover:bg-black/80 hover:border-white/30 shadow-lg active:scale-95 transition-all"
        >
          <Award size={18} />
        </motion.button>

        {/* Profile/Me avatar */}
        <motion.button
          onClick={() => router.push('/profile')}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#FE2C55]/60 hover:border-[#FE2C55] shadow-lg active:scale-95 transition-all bg-black flex items-center justify-center"
        >
          {user?.profile_pic_url ? (
            <img src={mediaUrl(user.profile_pic_url)} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#FE2C55] flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.substring(0, 2).toUpperCase() || 'ME'}
            </div>
          )}
        </motion.button>
      </div>

      {/* ─── MODAL OVERLAYS ─── */}
      <AnimatePresence>
        {/* 1. POST DETAIL MODAL (POPUP VIEWER) */}
        {selectedPost && (
          <motion.div
            key={`post-detail-${selectedPost.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col justify-between"
          >
            {/* Media/Content background Layer */}
            <div className="absolute inset-0 z-0">
              {selectedPost.media && selectedPost.media.length > 0 ? (
                <VideoPlayer
                  src={selectedPost.media[0]}
                  mediaUrls={selectedPost.media}
                  isActive={true}
                  isMuted={true}
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${selectedPost.gradient || 'from-indigo-900 to-purple-900'} flex flex-col items-center justify-center p-8 text-center`}>
                  {/* Curve Overlay */}
                  <AbstractLines />

                  <div className="max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative">
                    <div className="text-[#FE2C55] text-5xl mb-2 leading-none">“</div>
                    <p className="text-lg font-bold text-white leading-relaxed">{selectedPost.content}</p>
                    <div className="text-right text-[#25F4EE] text-5xl mt-2 leading-none">”</div>
                  </div>
                </div>
              )}
              {/* Overlay darken gradients */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
            </div>

            {/* TOP BAR */}
            <div className="relative z-10 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setShowComments(false);
                }}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/60 hover:text-white"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="flex items-center gap-3">
                <div
                  onClick={() => {
                    const found = creators.find(c => c.username === selectedPost.username) || {
                      id: selectedPost.user_id,
                      username: selectedPost.username,
                      full_name: selectedPost.full_name,
                      profile_pic_url: selectedPost.profile_pic_url,
                      followers_count: 0,
                      bio: 'Kreator CupaCup'
                    };
                    setSelectedCreator(found);
                  }}
                  className="flex items-center gap-2 bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 cursor-pointer hover:bg-black/50"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
                    {selectedPost.profile_pic_url ? (
                      <img src={mediaUrl(selectedPost.profile_pic_url)} alt={selectedPost.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs">
                        {selectedPost.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">@{selectedPost.username}</p>
                    <p className="text-[8px] text-white/50">Ikuti Profil</p>
                  </div>
                </div>
              </div>

              <div className="w-10 h-10" /> {/* Spacer */}
            </div>

            {/* SIDEBAR AND BOTTOM CONTENT LAYER */}
            <div className="relative z-10 flex items-end justify-between px-5 pb-8 pt-4 mt-auto">
              {/* Bottom Post Info */}
              <div className="flex-1 max-w-[75%] pr-4">
                <h2 className="text-base font-extrabold text-white leading-relaxed drop-shadow">
                  {selectedPost.content}
                </h2>
              </div>

              {/* Popup Floating Sidebar */}
              <div className="flex flex-col gap-4 items-center bg-black/35 backdrop-blur-lg border border-white/10 px-3 py-4 rounded-3xl shrink-0 shadow-xl">
                {/* Like Button */}
                <button
                  onClick={() => handleLike(selectedPost.id)}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-all text-white/90 hover:text-white"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    selectedPost.is_liked
                      ? 'bg-[#FE2C55]/20 border-[#FE2C55] text-[#FE2C55]'
                      : 'bg-black/30 border-white/10'
                  }`}>
                    <Heart size={20} fill={selectedPost.is_liked ? 'currentColor' : 'none'} className="transition-transform duration-200" />
                  </div>
                  <span className="text-[10px] font-extrabold">{selectedPost.like_count || 0}</span>
                </button>

                {/* Comment Button */}
                <button
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-all text-white/90 hover:text-white"
                >
                  <div className="w-11 h-11 rounded-full bg-black/30 border border-white/10 flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold">{selectedPost.reply_count || 0}</span>
                </button>

                {/* Repost Button */}
                <button
                  onClick={() => handleRepost(selectedPost.id)}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-all text-white/90 hover:text-white"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    selectedPost.is_reposted
                      ? 'bg-[#25F4EE]/20 border-[#25F4EE] text-[#25F4EE]'
                      : 'bg-black/30 border-white/10'
                  }`}>
                    <Share2 size={20} />
                  </div>
                  <span className="text-[10px] font-extrabold">{selectedPost.repost_count || 0}</span>
                </button>

                {/* Bookmark/Save Button */}
                <button
                  onClick={() => handleBookmark(selectedPost.id)}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-all text-white/90 hover:text-white"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                    selectedPost.is_saved
                      ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                      : 'bg-black/30 border-white/10'
                  }`}>
                    <Bookmark size={20} fill={selectedPost.is_saved ? 'currentColor' : 'none'} />
                  </div>
                  <span className="text-[10px] font-extrabold">Simpan</span>
                </button>
              </div>
            </div>

            {/* Slide-Up Comments Drawer inside pop-up */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  key="comments-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowComments(false)}
                  className="absolute inset-0 bg-black/70 z-40 backdrop-blur-sm"
                />
              )}
              {showComments && (
                <motion.div
                  key="comments-panel"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 26, stiffness: 250 }}
                  className="absolute bottom-0 left-0 right-0 z-50 bg-[#121212] rounded-t-3xl border-t border-white/10 flex flex-col h-[60%]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h3 className="text-white font-extrabold text-sm">{comments.length} Komentar</h3>
                    <button onClick={() => setShowComments(false)} className="text-white/60 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Scroll list */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {isLoadingComments ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-[#FE2C55]" size={24} />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-center text-white/30 text-xs py-8">Belum ada komentar.</p>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="flex items-start gap-3 text-xs">
                          <div className="w-8 h-8 rounded-full bg-[#FE2C55] flex items-center justify-center text-white font-bold shrink-0">
                            {c.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-none px-3.5 py-2.5">
                            <p className="text-[#FE2C55] font-extrabold">@{c.username}</p>
                            <p className="text-white/90 mt-1 leading-relaxed">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment inputs */}
                  <div className="px-4 py-3.5 border-t border-white/5 bg-[#121212] flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Tulis tanggapanmu..."
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendComment(); }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#FE2C55]/40 transition-colors"
                    />
                    <button
                      onClick={handleSendComment}
                      disabled={!commentInput.trim() || isSendingComment}
                      className="w-9 h-9 rounded-full bg-[#FE2C55] flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
                    >
                      {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 2. CREATOR PROFILE PREVIEW MODAL */}
        {selectedCreator && (
          <motion.div
            key="creator-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCreator(null)}
            className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm"
          />
        )}
        {selectedCreator && (
          <motion.div
            key="creator-modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[106] w-[90%] max-w-sm bg-gradient-to-b from-[#1c1c1e] to-[#121212] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
          >
            {/* Top Banner Cover */}
            <div className={`w-full h-28 bg-gradient-to-r ${selectedCreator.gradient || 'from-indigo-600 to-purple-600'} relative`}>
              <AbstractLines />
              <button
                onClick={() => setSelectedCreator(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Creator details content */}
            <div className="px-5 pb-6 text-center relative">
              {/* Profile Pic overlapping banner */}
              <div className="w-20 h-20 rounded-full border-4 border-[#121212] overflow-hidden mx-auto -mt-10 shadow-lg relative z-10">
                {selectedCreator.profile_pic_url ? (
                  <img src={mediaUrl(selectedCreator.profile_pic_url)} alt={selectedCreator.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-black text-xl">
                    {selectedCreator.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <h3 className="text-lg font-extrabold text-white mt-2.5">{selectedCreator.full_name}</h3>
              <p className="text-white/50 text-xs font-semibold">@{selectedCreator.username}</p>

              {/* Bio text */}
              <p className="text-white/80 text-xs mt-3 leading-relaxed px-2 font-medium">
                {selectedCreator.bio || 'Tidak ada deskripsi profil.'}
              </p>

              {/* Follower Stats grid */}
              <div className="grid grid-cols-2 gap-2 mt-4.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                <div>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Pengikut</p>
                  <p className="text-base font-extrabold text-white mt-0.5">
                    {formatFollowers(selectedCreator.followers_count || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Postingan</p>
                  <p className="text-base font-extrabold text-white mt-0.5">
                    {selectedCreator.posts_count || 0}
                  </p>
                </div>
              </div>

              {/* Actions bottom */}
              <div className="flex gap-3.5 mt-5">
                <button
                  onClick={() => handleFollowCreator(selectedCreator.id, selectedCreator.username)}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                    selectedCreator.is_following
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'bg-[#FE2C55] text-white hover:bg-[#e0243c]'
                  }`}
                >
                  {selectedCreator.is_following ? 'Mengikuti' : 'Ikuti'}
                </button>
                <button
                  onClick={() => {
                    setSelectedCreator(null);
                    handleMessageCreator(selectedCreator.id);
                  }}
                  className="flex-1 bg-white/5 border border-white/10 text-white hover:bg-white/10 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={14} /> Hubungi
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. LEADERBOARD MODAL (AWARD BUTTON) */}
        {showLeaderboard && (
          <motion.div
            key="leaderboard-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
            className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm"
          />
        )}
        {showLeaderboard && (
          <motion.div
            key="leaderboard-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[106] bg-[#121212] border-t border-white/10 rounded-t-3xl flex flex-col h-[75%] max-h-[600px] overflow-hidden"
          >
            {/* Handles */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <Award className="text-[#25F4EE]" size={20} />
                <span className="font-extrabold text-base tracking-tight">Kreator Terpopuler</span>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-2.5">
              {creators.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8">Belum ada data kreator.</p>
              ) : (
                creators
                  .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
                  .map((creator, index) => (
                    <div
                      key={creator.id}
                      onClick={() => {
                        setShowLeaderboard(false);
                        setSelectedCreator(creator);
                      }}
                      className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Rank Badge */}
                        <div className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                          index === 0 ? 'bg-amber-400 text-black' :
                          index === 1 ? 'bg-slate-300 text-black' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'text-white/45'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Profile avatar */}
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0">
                          {creator.profile_pic_url ? (
                            <img src={mediaUrl(creator.profile_pic_url)} alt={creator.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-black/40 flex items-center justify-center font-bold text-xs">
                              {creator.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-white leading-none">{creator.full_name}</p>
                          <p className="text-[10px] text-white/50 mt-1 font-semibold">@{creator.username}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-black text-[#FE2C55]">
                          {formatFollowers(creator.followers_count || 0)}
                        </p>
                        <p className="text-[8px] text-white/45 text-right font-semibold">Pengikut</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </motion.div>
        )}

        {/* 4. LIGHTNING BOLT TRENDING TOPICS MODAL */}
        {showTrendingTopics && (
          <motion.div
            key="trending-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTrendingTopics(false)}
            className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm"
          />
        )}
        {showTrendingTopics && (
          <motion.div
            key="trending-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[106] w-[88%] max-w-sm bg-gradient-to-b from-[#1c180f] to-[#0c0c0e] rounded-3xl border border-amber-500/25 p-5 shadow-2xl"
          >
            {/* Icon decoration */}
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20 mb-3 mx-auto">
              <Zap size={22} fill="currentColor" />
            </div>

            <h3 className="text-base font-extrabold text-white text-center tracking-tight">Topik Hangat Hari Ini!</h3>
            <p className="text-white/60 text-xs text-center mt-1">Hashtag paling populer yang terhitung dari postingan nyata database.</p>

            {/* Trending tags list */}
            <div className="mt-4.5 space-y-3">
              {trendingTags.length === 0 ? (
                <p className="text-center text-white/40 text-xs py-6">Belum ada hashtag populer saat ini.</p>
              ) : (
                trendingTags.map((t, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔥</span>
                      <div>
                        <h4 className="text-xs font-bold text-amber-400">{t.tag}</h4>
                        <p className="text-[10px] text-white/50 mt-0.5 font-semibold">{t.count} postingan dibagikan</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded-full">
                      #{idx + 1}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Action Close */}
            <button
              onClick={() => setShowTrendingTopics(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs py-3 rounded-2xl mt-5 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
            >
              Tutup
            </button>
          </motion.div>
        )}

        {/* 5. NOTIFICATIONS DRAWER OVERLAY */}
        {showNotifications && (
          <motion.div
            key="notifications-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifications(false)}
            className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm"
          />
        )}
        {showNotifications && (
          <motion.div
            key="notifications-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="fixed top-0 right-0 bottom-0 z-[106] w-[80%] max-w-sm bg-[#121212] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
                <Bell size={16} className="text-[#FE2C55]" /> Notifikasi ({notifications.length})
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10"
              >
                <X size={15} />
              </button>
            </div>

            {/* Lists */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center text-white/30 text-xs py-8">Belum ada notifikasi baru.</p>
              ) : (
                notifications.map((notif) => {
                  let notifText = '';
                  let notifIcon = '🔔';
                  if (notif.type === 'like') { notifText = 'menyukai postingan Anda.'; notifIcon = '❤️'; }
                  else if (notif.type === 'reply') { notifText = 'mengomentari postingan Anda.'; notifIcon = '💬'; }
                  else if (notif.type === 'follow') { notifText = 'mulai mengikuti Anda.'; notifIcon = '👤'; }
                  else if (notif.type === 'repost') { notifText = 'merepost postingan Anda.'; notifIcon = '🔄'; }

                  return (
                    <div key={notif.id} className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-3.5 hover:bg-white/8 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center text-sm shrink-0 border border-white/10">
                        {notifIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white leading-normal">
                          <span className="font-extrabold text-[#FE2C55]">@{notif.actor_username}</span> {notifText}
                        </p>
                        <span className="text-[9px] text-white/44 block mt-1 font-semibold">
                          {new Date(notif.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
