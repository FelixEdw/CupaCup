'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react';
import { getConversations, startConversation, searchUsers } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { useAuthStore } from '@/store';
import { Conversation, User } from '@/types';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    const fetch = async () => {
      const res = await getConversations();
      if (res.success) setConversations(res.data);
      setIsLoading(false);
    };
    fetch();
  }, [isAuthenticated, router]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const res = await searchUsers(q);
    if (res.success) setSearchResults(res.data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(search), 400);
    return () => clearTimeout(t);
  }, [search, handleSearch]);

  const handleStartConv = async (userId: number) => {
    const res = await startConversation(userId);
    if (res.success) {
      router.push(`/messages/${res.data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md px-4 py-4 border-b border-white/10">
        <h1 className="text-white font-bold text-2xl mb-3">Messages</h1>
        <input
          type="text"
          placeholder="Cari atau mulai percakapan baru..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark"
        />
      </div>

      {search ? (
        <div className="px-4 py-3">
          <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Hasil Pencarian</p>
          {searchResults.map((u) => (
            <motion.div
              key={u.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleStartConv(u.id)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                {u.profile_pic_url ? (
                  <img src={mediaUrl(u.profile_pic_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold text-base">{u.full_name}</p>
                <p className="text-white/50 text-sm">@{u.username}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-[#FE2C55] animate-spin" size={32} />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <MessageCircle size={56} className="text-white/20" />
          <p className="text-white/60 text-lg">Belum ada percakapan</p>
          <p className="text-white/30 text-sm">Cari pengguna untuk mulai chat</p>
        </div>
      ) : (
        <div className="px-2 py-2">
          {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/messages/${conv.id}`)}
              className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 cursor-pointer relative"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 relative">
                {conv.profile_pic_url ? (
                  <img src={mediaUrl(conv.profile_pic_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                    {conv.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {conv.unread_count > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FE2C55] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{conv.unread_count}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-semibold text-base ${conv.unread_count > 0 ? 'text-white' : 'text-white/80'}`}>
                    {conv.full_name}
                  </p>
                  <p className="text-white/30 text-xs">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: id })}
                  </p>
                </div>
                <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-white/80' : 'text-white/40'}`}>
                  {conv.last_message || 'Mulai percakapan...'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
