export interface User {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  bio?: string;
  profile_pic_url?: string;
  cover_pic_url?: string;
  role_id?: number;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: number;
  created_at?: string;
}

export interface Post {
  id: number;
  content?: string;
  reply_count: number;
  repost_count: number;
  like_count: number;
  created_at: string;
  parent_post_id?: number;
  repost_id?: number;
  // Author
  user_id: number;
  username: string;
  full_name: string;
  profile_pic_url?: string;
  // Interaction state
  is_liked?: number;
  is_reposted?: number;
  // Media
  media: string[];
  // Repost info
  rp_id?: number;
  rp_content?: string;
  rp_username?: string;
  rp_full_name?: string;
  rp_profile_pic?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content?: string;
  media_url?: string;
  shared_post_id?: number;
  message_type: 'text' | 'image' | 'post_share';
  is_read: boolean;
  created_at: string;
  username?: string;
  full_name?: string;
  profile_pic_url?: string;
  shared_post_content?: string;
  shared_post_username?: string;
  shared_post_media_url?: string;
}

export interface Conversation {
  id: number;
  last_message_at: string;
  other_user_id: number;
  username: string;
  full_name: string;
  profile_pic_url?: string;
  last_message?: string;
  last_msg_type?: string;
  unread_count: number;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
