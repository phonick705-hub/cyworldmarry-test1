import React, { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { bgmPlayer } from '../utils/soundSynthesizer';

interface MiniroomProps {
  guestbookCount: number;
  onGoToGuestbook: () => void;
  onShowToast: (msg: string) => void;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  icon: string;
}

export const Miniroom: React.FC<MiniroomProps> = ({
  guestbookCount,
  onGoToGuestbook,
  onShowToast,
}) => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [localHeartsSent, setLocalHeartsSent] = useState(0);

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const icons = ['💕', '💖', '💍', '✨', '💐', '🥰'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];

    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      x,
      y,
      icon: randomIcon,
    };

    setHearts((prev) => [...prev.slice(-12), newHeart]);
    setLocalHeartsSent((prev) => prev + 1);

    // Play subtle retro chime
    bgmPlayer.playChime();

    // Auto remove heart after animation
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);
  };

  const handleSendHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    bgmPlayer.playChime();
    onShowToast('신랑·신부에게 따뜻한 하트를 전했어요 💕');
    setLocalHeartsSent((prev) => prev + 1);

    const icons = ['💕', '💖', '💍', '✨'];
    const newHearts: FloatingHeart[] = [
      { id: Date.now(), x: 180 + Math.random() * 40, y: 190, icon: icons[0] },
      { id: Date.now() + 1, x: 220 + Math.random() * 40, y: 180, icon: icons[1] },
    ];
    setHearts((prev) => [...prev, ...newHearts]);
  };

  return (
    <div className="w-full space-y-2">
      {/* 4:3 Aspect Ratio Miniroom Box */}
      <div
        onClick={handleRoomClick}
        className="retro-box overflow-hidden relative cursor-pointer select-none group aspect-[4/3] bg-[#f9f5ed]"
        title="미니룸을 터치하면 축하 하트가 퐁퐁 피어나요!"
      >
        {/* Pixel Art Miniroom Artwork */}
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
          <img
            src="/assets/miniroom_clean.png"
            onError={(e) => {
              // Fallback to the original asset if needed
              (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/image_12f57ab4.png';
            }}
            alt="재현과 하은의 싸이월드 웨딩 미니룸"
            className="w-full h-full object-cover select-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
            loading="eager"
          />

          {/* Subtle Couple Idle Bobbing Overlay Indicator */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Groom & Bride idle sparkle indicator */}
            <div className="w-32 h-28 relative mt-16 animate-idle flex justify-center">
              <span className="absolute -top-3 left-6 text-xs text-[#2E8BFF] animate-pulse">✦</span>
              <span className="absolute -top-4 right-6 text-xs text-[#F4A6B7] animate-pulse">♥</span>
            </div>
          </div>
        </div>

        {/* Floating Heart Particles */}
        {hearts.map((heart) => (
          <span
            key={heart.id}
            style={{
              left: `${heart.x}px`,
              top: `${heart.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute text-xl pointer-events-none animate-float-heart z-20 select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
          >
            {heart.icon}
          </span>
        ))}

        {/* Top Badges inside Miniroom */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
          <span className="bg-[#3B2F2F]/80 backdrop-blur-xs text-[#F5EFE4] px-2 py-0.5 rounded text-[10px] font-pixel border border-[#3B2F2F]/40 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#FFD43B]" />
            ROOM No. 0523
          </span>
        </div>

        {/* Interactive "하트 보내기" Button in top right */}
        <button
          onClick={handleSendHeart}
          className="absolute top-2.5 right-2.5 z-10 retro-btn bg-white/95 hover:bg-white text-[#3B2F2F] px-2 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer"
          title="축하 하트 보내기"
        >
          <Heart className="w-3 h-3 text-[#F4A6B7] fill-[#F4A6B7]" />
          <span>축하 {localHeartsSent > 0 ? `+${localHeartsSent}` : '하트'}</span>
        </button>

        {/* Semi-transparent Black Speech Bubble Caption at bottom (synced with guestbook!) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[90%] flex justify-center pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGoToGuestbook();
            }}
            className="bg-[#222222]/85 hover:bg-[#111111] text-white px-4 py-1.5 rounded-full text-xs font-pixel flex items-center gap-1.5 shadow-md border border-white/20 transition-transform active:scale-95 cursor-pointer"
          >
            <span className="text-[#F4A6B7]">♥</span>
            <span>벌써 {guestbookCount}명이 마음을 남겼어요</span>
            <span className="text-[10px] text-white/70 ml-0.5">›</span>
          </button>
        </div>
      </div>

      {/* Miniroom Sub-bar Information */}
      <div className="flex items-center justify-between text-[11px] font-pixel text-[#666666] px-1">
        <span className="flex items-center gap-1">
          <span className="text-[#2E8BFF]">●</span>
          <span>미니룸을 탭하면 하트가 피어나요</span>
        </span>
        <button
          onClick={onGoToGuestbook}
          className="text-[#2E8BFF] hover:underline flex items-center gap-0.5 cursor-pointer font-pixel"
        >
          <span>방명록 남기러 가기</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
};
