'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid, FileText, Heart, Repeat2, Bookmark, Settings, MessageCircle } from 'lucide-react';
import { getUserProfile, getUserPosts, toggleFollow, getSavedPosts, getRepostedPosts } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { useAuthStore } from '@/store';
import { User, Post } from '@/types';

type TabType = 'posts' | 'notes' | 'reposted' | 'saved';

const NOTE_GRADIENTS = [
  'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
  'from-[#2d1b69] via-[#11998e] to-[#38ef7d]',
  'from-[#360033] via-[#0b8793] to-[#360033]',
  'from-[#200122] via-[#6f0000] to-[#200122]',
  'from-[#0f0c29] via-[#302b63] to-[#24243e]',
  'from-[#1f4037] via-[#99f2c8] to-[#1f4037]',
  'from-[#2c3e50] via-[#fd746c] to-[#2c3e50]',
];

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: me, isAuthenticated } = useAuthStore();
  const username = params.username as string;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isMyProfile = me?.username === username;

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        getUserProfile(username),
        getUserPosts(username),
      ]);
      if (profileRes.success) {
        setProfile(profileRes.data);
        setIsFollowing(Boolean(profileRes.data.is_following));
      }
      if (postsRes.success) setPosts(postsRes.data);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Load reposted / saved when tabs activated
  useEffect(() => {
    if (activeTab === 'reposted' && profile && repostedPosts.length === 0) {
      getRepostedPosts(profile.id).then(res => {
        if (res.success) setRepostedPosts(res.data);
      });
    }
    if (activeTab === 'saved' && isMyProfile && savedPosts.length === 0) {
      getSavedPosts().then(res => {
        if (res.success) setSavedPosts(res.data);
      });
    }
  }, [activeTab, profile, isMyProfile, repostedPosts.length, savedPosts.length]);

  const handleFollow = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!profile) return;
    setIsFollowLoading(true);
    try {
      const res = await toggleFollow(profile.id);
      if (res.success) {
        setIsFollowing(res.data.action === 'followed');
        setProfile(prev => prev ? {
          ...prev,
          followers_count: (prev.followers_count || 0) + (res.data.action === 'followed' ? 1 : -1)
        } : null);
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-white/60 text-lg">User tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const formatNum = (n?: number) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const currentPosts =
    activeTab === 'posts' ? posts.filter(p => p.media && p.media.length > 0) :
      activeTab === 'notes' ? posts.filter(p => !p.media || p.media.length === 0) :
        activeTab === 'reposted' ? repostedPosts :
          savedPosts;


  return (
    <div className="h-full overflow-y-auto bg-black pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white hover:text-white/70 p-1">
          <ArrowLeft size={24} />
        </button>
        {!isMyProfile && (
          <h1 className="text-white font-bold text-xl">@{profile.username}</h1>
        )}
      </div>

      {/* Centered Profile Header */}
      <div className="flex flex-col items-center text-center px-5 mt-6 mb-6">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 mb-4 shadow-lg shrink-0">
          {profile.profile_pic_url ? (
            <img src={mediaUrl(profile.profile_pic_url)} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-4xl">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <h2 className="text-white font-bold text-2xl mb-1">{profile.full_name}</h2>
        <p className="text-white/50 text-sm mb-3">@{profile.username}</p>

        {profile.bio && (
          <p className="text-white/90 text-sm leading-relaxed max-w-sm mb-4">{profile.bio}</p>
        )}

        {/* Actions Button */}
        <div className="flex gap-2 mb-6">
          {isMyProfile ? (
            <button
              onClick={() => router.push('/settings')}
              className="px-10 py-3 border border-white/30 rounded-xl text-white text-xs font-bold hover:bg-white/10 transition-all shadow-md"
            >
              Edit Profil
            </button>
          ) : (
            <button
              onClick={handleFollow}
              disabled={isFollowLoading}
              className={`px-10 py-3 rounded-xl text-xs font-bold transition-all shadow-md ${isFollowing
                  ? 'border border-white/30 text-white hover:bg-white/10'
                  : 'bg-[#FE2C55] text-white hover:bg-[#e0243c]'
                }`}
            >
              {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="flex gap-10">
          {[
            { label: 'Posts', value: profile.posts_count },
            { label: 'Followers', value: profile.followers_count },
            { label: 'Following', value: profile.following_count },
          ].map(({ label, value }) => (
            <div key={label} className="text-center min-w-[75px]">
              <div className="text-white font-bold text-xl">{formatNum(value)}</div>
              <div className="text-white/50 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-white/10">
        <div className="flex border-b border-white/10">
          {/* Notes tab */}
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${activeTab === 'notes'
                ? 'text-white border-b-2 border-white'
                : 'text-white/40 hover:text-white/70'
              }`}
          >
            <FileText size={20} />
            <span className="text-sm font-semibold">Cuapan</span>
          </button>

          {/* Posts tab */}
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${activeTab === 'posts'
                ? 'text-white border-b-2 border-white'
                : 'text-white/40 hover:text-white/70'
              }`}
          >
            <Grid size={20} />
            <span className="text-sm font-semibold">Posts</span>
          </button>

          {/* Reposted tab */}
          <button
            onClick={() => setActiveTab('reposted')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${activeTab === 'reposted'
                ? 'text-white border-b-2 border-white'
                : 'text-white/40 hover:text-white/70'
              }`}
          >
            <Repeat2 size={20} />
            <span className="text-sm font-semibold">Reposted</span>
          </button>

          {/* Saved tab — only visible on own profile */}
          {isMyProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${activeTab === 'saved'
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/40 hover:text-white/70'
                }`}
            >
              <Bookmark size={20} />
              <span className="text-sm font-semibold">Saved</span>
            </button>
          )}
        </div>

        {/* Grid content */}
        {currentPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-5xl">
              {activeTab === 'posts' ? '📭' : activeTab === 'notes' ? '📝' : activeTab === 'reposted' ? '' : ''}
            </div>
            <p className="text-white/60 text-base">
              {activeTab === 'posts'
                ? 'Belum ada post'
                : activeTab === 'notes'
                  ? 'Belum ada catatan'
                  : activeTab === 'reposted'
                    ? 'Belum ada repost'
                    : 'Belum ada yang disimpan'}
            </p>
          </div>
        ) : activeTab === 'notes' ? (
          <div className="flex flex-col divide-y divide-white/10 border-t border-white/10">
            {currentPosts.map((post) => (
              <motion.div
                key={post.id}
                whileTap={{ opacity: 0.95 }}
                onClick={() => router.push(`/post/${post.id}`)}
                className="flex gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors"
              >
                {/* Left side: Avatar */}
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-white/10">
                  {profile.profile_pic_url ? (
                    <img
                      src={mediaUrl(profile.profile_pic_url)}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Right side: Note card details */}
                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white font-bold text-[15px] hover:underline leading-tight truncate">
                      {profile.full_name}
                    </span>
                    <span className="text-white/40 text-[14px] truncate leading-tight">
                      @{profile.username}
                    </span>
                    <span className="text-white/30 text-[14px] leading-tight shrink-0">•</span>
                    <span className="text-white/40 text-[14px] leading-tight shrink-0">
                      {new Date(post.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-white text-[15px] mt-1.5 leading-relaxed break-words whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Actions Bar (Twitter style) */}
                  <div className="flex items-center justify-between max-w-sm mt-4 pt-1 text-white/50">
                    {/* Reply button */}
                    <button className="flex items-center gap-2.5 hover:text-[#FE2C55] transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-[#FE2C55]/10">
                        <MessageCircle size={16} />
                      </div>
                      <span className="text-xs">{formatNum(post.reply_count)}</span>
                    </button>

                    {/* Repost button */}
                    <button
                      className={`flex items-center gap-2.5 hover:text-green-500 transition-colors group ${post.is_reposted ? 'text-green-500' : ''
                        }`}
                    >
                      <div className="p-2 rounded-full group-hover:bg-green-500/10">
                        <Repeat2 size={16} />
                      </div>
                      <span className="text-xs">{formatNum(post.repost_count)}</span>
                    </button>

                    {/* Like button */}
                    <button
                      className={`flex items-center gap-2.5 hover:text-[#FE2C55] transition-colors group ${post.is_liked ? 'text-[#FE2C55]' : ''
                        }`}
                    >
                      <div className="p-2 rounded-full group-hover:bg-[#FE2C55]/10">
                        <Heart size={16} className={post.is_liked ? 'fill-[#FE2C55] text-[#FE2C55]' : ''} />
                      </div>
                      <span className="text-xs">{formatNum(post.like_count)}</span>
                    </button>

                    {/* Bookmark button */}
                    <button
                      className={`flex items-center gap-2.5 hover:text-yellow-500 transition-colors group ${post.is_saved ? 'text-yellow-500' : ''
                        }`}
                    >
                      <div className="p-2 rounded-full group-hover:bg-yellow-500/10">
                        <Bookmark size={16} className={post.is_saved ? 'fill-yellow-500' : ''} />
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {currentPosts.map((post) => (
              <motion.div
                key={post.id}
                whileTap={{ opacity: 0.7 }}
                onClick={() => router.push(`/post/${post.id}`)}
                className="aspect-square relative bg-white/5 cursor-pointer overflow-hidden"
              >
                {post.media?.[0] ? (
                  /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(post.media[0]) ? (
                    <video
                      src={mediaUrl(post.media[0])}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl(post.media[0])}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${NOTE_GRADIENTS[post.id % NOTE_GRADIENTS.length]} flex items-center justify-center p-3 relative`}>
                    <p className="text-white text-xs font-semibold text-center line-clamp-4 leading-relaxed px-1">
                      "{post.content}"
                    </p>
                  </div>
                )}
                {/* Like overlay */}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                  <Heart size={13} className="text-white fill-white" />
                  <span className="text-white text-xs font-semibold drop-shadow">{formatNum(post.like_count)}</span>
                </div>
                {/* Repost badge */}
                {activeTab === 'reposted' && (
                  <div className="absolute top-1.5 right-1.5">
                    <Repeat2 size={13} className="text-green-400" />
                  </div>
                )}
                {/* Saved badge */}
                {activeTab === 'saved' && (
                  <div className="absolute top-1.5 right-1.5">
                    <Bookmark size={13} className="text-yellow-400 fill-yellow-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
