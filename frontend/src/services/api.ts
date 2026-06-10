import { User, Post, ApiResponse, StoryGroup, Conversation } from '@/types';

let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.0.')) {
    API_BASE = `http://${hostname}:3001`;
  }
}

// Helper to get stored token
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('matchup_token');
};

// Generic fetch wrapper
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Handle auth errors — clear token and redirect to login
  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      localStorage.removeItem('matchup_token');
      // Only redirect if not already on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return { success: false, message: 'Sesi habis. Silakan login kembali.' } as ApiResponse<T>;
  }

  const data = await res.json();
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function register(payload: {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}) {
  return apiFetch<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return apiFetch<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiFetch<User>('/api/auth/me');
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export async function getPublicFeed() {
  return apiFetch<Post[]>('/api/posts/public');
}

export async function getAuthFeed() {
  return apiFetch<Post[]>('/api/posts/feed');
}

export async function getNotesFeed() {
  return apiFetch<Post[]>('/api/posts/notes');
}

export async function getFollowingFeed() {
  return apiFetch<Post[]>('/api/posts/following');
}

export async function getTrendingTags() {
  return apiFetch<any[]>('/api/posts/trending-tags');
}



export async function toggleLike(postId: number) {
  return apiFetch<{ action: 'liked' | 'unliked' }>(`/api/posts/${postId}/like`, {
    method: 'POST',
  });
}

export async function repost(postId: number) {
  return apiFetch<{ action: string }>(`/api/posts/${postId}/repost`, {
    method: 'POST',
  });
}

export async function toggleSave(postId: number) {
  return apiFetch<{ action: 'saved' | 'unsaved' }>(`/api/posts/${postId}/save`, {
    method: 'POST',
  });
}

export async function getSavedPosts() {
  return apiFetch<Post[]>('/api/posts/saved');
}

export async function getRepostedPosts(userId: number) {
  return apiFetch<Post[]>(`/api/posts/reposted/${userId}`);
}

export async function createPost(formData: FormData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
}

export async function getPost(id: number) {
  return apiFetch<{ post: Post; replies: Post[] }>(`/api/posts/${id}`);
}

export async function createReply(postId: number, content: string) {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('parent_post_id', String(postId));
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUserProfile(username: string) {
  return apiFetch<User>(`/api/users/${username}`);
}

export async function getUserPosts(username: string) {
  return apiFetch<Post[]>(`/api/posts/user/${username}`);
}

export async function toggleFollow(userId: number) {
  return apiFetch<{ action: 'followed' | 'unfollowed' }>(`/api/users/${userId}/follow`, {
    method: 'POST',
  });
}

export async function searchUsers(q: string) {
  return apiFetch<User[]>(`/api/users/search?q=${encodeURIComponent(q)}`);
}

export async function getCreators() {
  return apiFetch<User[]>('/api/users/creators');
}

export async function getNotifications() {
  return apiFetch<any[]>('/api/users/me/notifications');
}

export async function updateProfile(formData: FormData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/users/me/profile`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
}

// ─── Conversations ───────────────────────────────────────────────────────────

export async function getConversations() {
  return apiFetch<any[]>('/api/conversations');
}

export async function startConversation(recipient_id: number) {
  return apiFetch<any>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ recipient_id }),
  });
}

export async function getMessages(convId: number) {
  return apiFetch<any[]>(`/api/conversations/${convId}/messages`);
}

export async function getConversationInfo(convId: number) {
  return apiFetch<Conversation>(`/api/conversations/${convId}`);
}

export async function sendMessage(convId: number, content: string, sharedPostId?: number) {
  return apiFetch<any>(`/api/conversations/${convId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, shared_post_id: sharedPostId }),
  });
}

export async function getStoryFeed() {
  return apiFetch<StoryGroup[]>('/api/stories/feed');
}

export async function createStory(formData: FormData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/stories`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return res.json();
}

export async function viewStory(storyId: number) {
  return apiFetch<any>(`/api/stories/${storyId}/view`, {
    method: 'POST',
  });
}

export async function deletePost(postId: number) {
  return apiFetch<any>(`/api/posts/${postId}`, {
    method: 'DELETE',
  });
}

export async function deleteStory(storyId: number) {
  return apiFetch<any>(`/api/stories/${storyId}`, {
    method: 'DELETE',
  });
}

// ─── Media URL Helper ─────────────────────────────────────────────────────────

export function mediaUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
