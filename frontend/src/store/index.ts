import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Post } from '@/types';

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('matchup_token', token);
        }
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('matchup_token');
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (updated) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updated } : null,
        })),
    }),
    {
      name: 'matchup-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      skipHydration: true,
    }
  )
);

// ─── Feed Store ───────────────────────────────────────────────────────────────

interface FeedStore {
  posts: Post[];
  currentIndex: number;
  isMuted: boolean;
  isLoading: boolean;
  setPosts: (posts: Post[]) => void;
  appendPosts: (posts: Post[]) => void;
  setCurrentIndex: (index: number) => void;
  toggleMute: () => void;
  setLoading: (loading: boolean) => void;
  optimisticLike: (postId: number) => void;
  resetFeed: () => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  posts: [],
  currentIndex: 0,
  isMuted: true,
  isLoading: false,

  setPosts: (posts) => set({ posts }),

  appendPosts: (newPosts) =>
    set((state) => {
      const existingIds = new Set(state.posts.map((p) => p.id));
      const unique = newPosts.filter((p) => !existingIds.has(p.id));
      return { posts: [...state.posts, ...unique] };
    }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setLoading: (isLoading) => set({ isLoading }),

  // Optimistic UI: toggle like immediately before API call
  optimisticLike: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id !== postId) return p;
        const nowLiked = !p.is_liked;
        return {
          ...p,
          is_liked: nowLiked ? 1 : 0,
          like_count: nowLiked ? p.like_count + 1 : Math.max(0, p.like_count - 1),
        };
      }),
    })),

  // Reset feed so it refetches from scratch
  resetFeed: () => set({ posts: [], currentIndex: 0, isLoading: false }),
}));
