import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, X, RotateCcw } from 'lucide-react';
import { bgmPlayer } from '../utils/soundSynthesizer';
import { AcornService, DisplayedMiniroomGift } from '../services/acornService';
import { useAuth } from '../context/AuthContext';

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
  const { isAdmin } = useAuth();
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [totalHeartsSent, setTotalHeartsSent] = useState<number>(() =>
    AcornService.getCachedMiniroomHearts()
  );
  const [displayedGifts, setDisplayedGifts] = useState<DisplayedMiniroomGift[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResettingHearts, setIsResettingHearts] = useState(false);

  useEffect(() => {
    const unsubGifts = AcornService.subscribeMiniroomGifts((gifts) => {
      setDisplayedGifts(gifts);
    });
    const unsubHearts = AcornService.subscribeMiniroomHearts((count) => {
      setTotalHeartsSent(count);
    });
    return () => {
      unsubGifts();
      unsubHearts();
    };
  }, []);

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
    void AcornService.incrementMiniroomHearts();

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
    void AcornService.incrementMiniroomHearts();

    const icons = ['💕', '💖', '💍', '✨'];
    const baseId = Date.now();
    const newHearts: FloatingHeart[] = [
      { id: baseId, x: 180 + Math.random() * 40, y: 190, icon: icons[0] },
      { id: baseId + 1, x: 220 + Math.random() * 40, y: 180, icon: icons[1] },
    ];
    setHearts((prev) => [...prev.slice(-12), ...newHearts]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== baseId && h.id !== baseId + 1));
    }, 1200);
  };

  const handleConfirmResetHearts = async () => {
    if (!isAdmin || isResettingHearts) return;
    setIsResettingHearts(true);
    try {
      await AcornService.resetMiniroomHearts();
      setShowResetModal(false);
      bgmPlayer.playChime();
      onShowToast('축하 하트 누적 카운트가 0으로 초기화되었습니다.');
    } catch {
      onShowToast('초기화에 실패했습니다. 관리자 권한을 확인해주세요.');
    } finally {
      setIsResettingHearts(false);
    }
  };

  const handleGiftClick = (e: React.MouseEvent, gift: DisplayedMiniroomGift) => {
    e.stopPropagation();
    bgmPlayer.playChime();
    onShowToast(`🎁 ${gift.senderName}님이 선물한 '${gift.name}'이(가) 진열되어 있어요!`);
  };

  const handleRemoveGift = async (e: React.MouseEvent, giftId: string) => {
    e.stopPropagation();
    try {
      await AcornService.deleteMiniroomGift(giftId);
      onShowToast('미니룸 선물이 정리되었습니다.');
    } catch {
      onShowToast('선물 삭제에 실패했습니다.');
    }
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

        {/* Top Right: Admin Reset + Interactive "하트 보내기" Button */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowResetModal(true);
              }}
              className="retro-btn bg-[#FFF3BF]/95 hover:bg-[#FFE066] text-[#D9480F] px-2 py-1 text-[10px] font-pixel flex items-center gap-1 cursor-pointer"
              title="누적 축하 하트 초기화 (관리자 전용)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>초기화</span>
            </button>
          )}
          <button
            onClick={handleSendHeart}
            className="retro-btn bg-white/95 hover:bg-white text-[#3B2F2F] px-2 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer"
            title="축하 하트 보내기"
          >
            <Heart className="w-3 h-3 text-[#F4A6B7] fill-[#F4A6B7]" />
            <span>축하 {totalHeartsSent > 0 ? `+${totalHeartsSent.toLocaleString()}` : '하트'}</span>
          </button>
        </div>

        {/* Displayed Miniroom Gifts Shelf (above bottom caption bubble) */}
        {displayedGifts.length > 0 && (
          <div className="absolute bottom-12 left-2.5 right-2.5 z-10 flex flex-wrap items-end justify-start gap-1.5 pointer-events-none">
            {displayedGifts.slice(-8).map((gift) => (
              <div
                key={gift.id}
                onClick={(e) => handleGiftClick(e, gift)}
                title={`${gift.senderName}님의 선물: ${gift.name}`}
                className="pointer-events-auto relative group/gift bg-white/90 hover:bg-white border-2 border-[#3B2F2F] rounded-md px-1.5 py-0.5 shadow-[2px_2px_0_#3B2F2F] flex items-center gap-1 cursor-pointer transition-transform hover:-translate-y-0.5"
              >
                <span className="text-base leading-none">{gift.emoji}</span>
                <span className="text-[9px] font-pixel text-[#3B2F2F] max-w-[54px] truncate">
                  {gift.senderName}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveGift(e, gift.id)}
                    className="ml-0.5 text-[#E03131] hover:text-red-700 cursor-pointer"
                    title="진열 선물 삭제 (관리자)"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
          <span>
            {displayedGifts.length > 0
              ? `미니룸에 ${displayedGifts.length}개의 축하 선물이 진열되어 있어요`
              : '미니룸을 탭하면 하트가 피어나요'}
          </span>
        </span>
        <button
          onClick={onGoToGuestbook}
          className="text-[#2E8BFF] hover:underline flex items-center gap-0.5 cursor-pointer font-pixel"
        >
          <span>방명록 남기러 가기</span>
          <span>›</span>
        </button>
      </div>

      {/* Admin Confirm Reset Hearts Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="retro-box bg-white max-w-xs w-full p-4 space-y-3 shadow-[6px_6px_0_#D9480F]">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 font-pixel text-xs font-bold text-[#3B2F2F]">
                <RotateCcw className="w-4 h-4 text-[#D9480F]" />
                <span>축하 하트 초기화</span>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-[#888888] hover:text-[#3B2F2F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-body text-xs text-[#444444] leading-relaxed text-center py-1">
              지금까지 누적된 축하 하트 <strong className="text-[#E03131]">{totalHeartsSent.toLocaleString()}개</strong>를 <strong className="text-[#3B2F2F]">0</strong>으로 초기화할까요?
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 text-xs font-pixel cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmResetHearts}
                disabled={isResettingHearts}
                className="retro-btn flex-1 bg-[#E03131] hover:bg-[#c92a2a] text-white py-2 text-xs font-pixel cursor-pointer disabled:opacity-60"
              >
                {isResettingHearts ? '초기화 중...' : '초기화하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
