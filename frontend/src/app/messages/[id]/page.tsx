'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { getMessages, sendMessage, getConversationInfo } from '@/services/api';
import { mediaUrl } from '@/services/api';
import { useAuthStore } from '@/store';
import { Message } from '@/types';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const convId = Number(params.id);
  const { user, token, isAuthenticated } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState({ username: '', full_name: '', profile_pic_url: '' });

  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }

    const fetchMsgs = async () => {
      const res = await getMessages(convId);
      if (res.success) {
        setMessages(res.data);
      }
      setIsLoading(false);
    };

    const fetchConvInfo = async () => {
      const res = await getConversationInfo(convId);
      if (res.success && res.data) {
        setOtherUser({
          username: res.data.username || '',
          full_name: res.data.full_name || '',
          profile_pic_url: res.data.profile_pic_url || '',
        });
      }
    };

    fetchConvInfo();
    fetchMsgs();

    // Socket.IO for real-time
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.emit('join_conversation', convId);
    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [convId, isAuthenticated, token, router, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic message
    const optimistic: Message = {
      id: Date.now(),
      conversation_id: convId,
      sender_id: user!.id,
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessage(convId, content);
    } catch {}
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={() => router.back()} className="text-white hover:text-white/70">
          <ArrowLeft size={22} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
          {otherUser.profile_pic_url ? (
            <img src={mediaUrl(otherUser.profile_pic_url)} alt={otherUser.username} className="w-full h-full object-cover" />
          ) : (
            (otherUser.username || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-white font-semibold">{otherUser.full_name || otherUser.username || `Conversation ${convId}`}</p>
          <p className="text-white/40 text-xs">@{otherUser.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-scroll px-4 py-4 flex flex-col gap-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-[#FE2C55] animate-spin" size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="text-4xl">👋</div>
            <p className="text-white/60 text-sm">Mulai percakapan!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-[#FE2C55] text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}
                >
                  {msg.media_url && (
                    <img src={mediaUrl(msg.media_url)} alt="" className="rounded-lg mb-1 max-w-full" />
                  )}
                  {msg.content && <p>{msg.content}</p>}
                  
                  {msg.message_type === 'post_share' && msg.shared_post_id && (
                    <div 
                      className={`mt-2 p-2 rounded-xl border cursor-pointer flex gap-3 ${
                        isMe ? 'bg-black/20 border-white/20 hover:bg-black/30' : 'bg-black/40 border-white/10 hover:bg-black/50'
                      } transition-colors`}
                      onClick={() => router.push(`/profile/${msg.shared_post_username}`)}
                    >
                      {msg.shared_post_media_url ? (
                        /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(msg.shared_post_media_url) ? (
                          <video
                            src={mediaUrl(msg.shared_post_media_url)}
                            className="w-14 h-18 object-cover rounded-lg shrink-0"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={mediaUrl(msg.shared_post_media_url)}
                            alt=""
                            className="w-14 h-18 object-cover rounded-lg shrink-0"
                          />
                        )
                      ) : (
                        <div className="w-14 h-18 bg-gradient-to-br from-purple-900 to-black rounded-lg shrink-0 flex items-center justify-center text-xs text-white/50 border border-white/5">
                          Note
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <p className="text-xs font-bold text-white/90 truncate">@{msg.shared_post_username}</p>
                        <p className="text-xs text-white/70 line-clamp-2 mt-1 leading-snug">{msg.shared_post_content || '(Tanpa teks)'}</p>
                      </div>
                    </div>
                  )}

                  <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/60' : 'text-white/40'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-black">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tulis pesan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white/8 border border-white/15 rounded-full px-5 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-[#FE2C55]/50"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 bg-[#FE2C55] rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
