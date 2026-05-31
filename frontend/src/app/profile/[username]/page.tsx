'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid, Heart, Repeat2, Bookmark, Settings } from 'lucide-react';
import { getUserProfile, getUserPosts, toggleFollow, getSavedPosts, getRepostedPosts } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { useAuthStore } from '@/store';
import { User, Post } from '@/types';

type TabType = 'posts' | 'reposted' | 'saved';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: me, isAuthenticated } = useAuthStore();
  const username = params.username as string;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
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
    activeTab === 'posts' ? posts :
    activeTab === 'reposted' ? repostedPosts :
    savedPosts;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white hover:text-white/70 p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white font-bold text-xl">@{profile.username}</h1>
        {isMyProfile && (
          <button className="ml-auto text-white hover:text-white/70 p-1" onClick={() => router.push('/settings')}>
            <Settings size={24} />
          </button>
        )}
      </div>

      {/* Cover */}
      <div className="relative h-44 bg-gradient-to-br from-[#FE2C55]/40 to-[#25F4EE]/20">
        {profile.cover_pic_url && (
          <img src={mediaUrl(profile.cover_pic_url)} alt="Cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Avatar & Actions */}
      <div className="px-5 -mt-14 flex items-end justify-between mb-5">
        <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden">
          {profile.profile_pic_url ? (
            <img src={mediaUrl(profile.profile_pic_url)} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-4xl">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-14">
          {isMyProfile ? (
            <button
              onClick={() => router.push('/settings')}
              className="px-6 py-2.5 border border-white/30 rounded-xl text-white text-sm font-semibold hover:bg-white/10 transition-all"
            >
              Edit Profil
            </button>
          ) : (
            <button
              onClick={handleFollow}
              disabled={isFollowLoading}
              className={`px-7 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isFollowing
                  ? 'border border-white/30 text-white hover:bg-white/10'
                  : 'bg-[#FE2C55] text-white hover:bg-[#e0243c]'
              }`}
            >
              {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Profile info */}
      <div className="px-5 mb-6">
        <h2 className="text-white font-bold text-2xl mb-1">{profile.full_name}</h2>
        <p className="text-white/50 text-base mb-3">@{profile.username}</p>
        {profile.bio && (
          <p className="text-white/90 text-base leading-relaxed mb-4">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-7">
          {[
            { label: 'Posts', value: profile.posts_count },
            { label: 'Followers', value: profile.followers_count },
            { label: 'Following', value: profile.following_count },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-white font-bold text-xl">{formatNum(value)}</div>
              <div className="text-white/50 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-white/10">
        <div className="flex border-b border-white/10">
          {/* Posts tab */}
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${
              activeTab === 'posts'
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
            className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${
              activeTab === 'reposted'
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
              className={`flex-1 flex items-center justify-center gap-2 py-4 transition-colors ${
                activeTab === 'saved'
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
              {activeTab === 'posts' ? '📭' : activeTab === 'reposted' ? '🔁' : '🔖'}
            </div>
            <p className="text-white/60 text-base">
              {activeTab === 'posts'
                ? 'Belum ada post'
                : activeTab === 'reposted'
                ? 'Belum ada repost'
                : 'Belum ada yang disimpan'}
            </p>
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
                  <div className="w-full h-full flex items-center justify-center p-3">
                    <p className="text-white/60 text-xs text-center line-clamp-4">{post.content}</p>
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
