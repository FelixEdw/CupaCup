'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useFeedStore } from '@/store';
import { motion } from 'framer-motion';

export default function MuteButton() {
  const { isMuted, toggleMute } = useFeedStore();

  return (
    <motion.button
      onClick={toggleMute}
      whileTap={{ scale: 0.9 }}
      className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all"
    >
      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </motion.button>
  );
}
