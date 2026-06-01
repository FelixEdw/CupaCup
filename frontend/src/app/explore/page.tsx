'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchUsers } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { User } from '@/types';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setIsLoading(true);
    try {
      const res = await searchUsers(q);
      if (res.success) setResults(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <div className="h-full overflow-y-auto bg-black pb-12">
      {/* Search header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md px-4 pt-4 pb-3 border-b border-white/10">
        <h1 className="text-white font-bold text-2xl mb-3">Explore</h1>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Cari pengguna..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-dark pl-11 pr-11"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-[#FE2C55] animate-spin" size={28} />
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-1">
            {results.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/profile/${user.username}`)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                  {user.profile_pic_url ? (
                    <img src={mediaUrl(user.profile_pic_url)} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold">{user.full_name}</p>
                  <p className="text-white/50 text-sm">@{user.username}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : query && !isLoading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="text-4xl">🔍</div>
            <p className="text-white/60">Tidak ada hasil untuk "{query}"</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="text-4xl animate-float">🌟</div>
            <p className="text-white font-semibold">Temukan Pengguna</p>
            <p className="text-white/50 text-sm text-center">
              Ketik nama atau username untuk mencari
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
