'use client';

import { useRef, useEffect, useCallback } from 'react';
import { mediaUrl } from '@/services/api';

interface VideoPlayerProps {
  src?: string;
  mediaUrls?: string[];
  isActive: boolean;
  isMuted: boolean;
  onClick?: () => void;
}

export default function VideoPlayer({
  src,
  mediaUrls,
  isActive,
  isMuted,
  onClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect if media is a video
  const videoSrc = src || (mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : undefined);
  const isVideo = videoSrc
    ? /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(videoSrc)
    : false;

  const fullSrc = videoSrc ? mediaUrl(videoSrc) : undefined;

  const handlePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      // Autoplay blocked — silently ignore
    }
  }, []);

  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  useEffect(() => {
    if (isActive) {
      handlePlay();
    } else {
      handlePause();
    }
  }, [isActive, handlePlay, handlePause]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  if (!fullSrc) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-white/30 text-6xl">🎬</div>
      </div>
    );
  }

  if (!isVideo) {
    // Render as image carousel
    const images = mediaUrls?.map(mediaUrl) || [fullSrc];
    return (
      <div className="w-full h-full relative" onClick={onClick}>
        <img
          src={images[0]}
          alt="Post media"
          className="w-full h-full object-cover"
        />
        {images.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 rounded-full px-3 py-1 text-white text-xs font-medium">
            1/{images.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" onClick={onClick}>
      <video
        ref={videoRef}
        src={fullSrc}
        loop
        playsInline
        muted={isMuted}
        className="w-full h-full object-cover"
        preload="metadata"
      />
    </div>
  );
}
