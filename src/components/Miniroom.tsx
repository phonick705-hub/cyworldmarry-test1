import React, { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, X, RotateCcw, Move, Check, Gift, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { bgmPlayer } from '../utils/soundSynthesizer';
import { AcornService, DisplayedMiniroomGift } from '../services/acornService';
import { MINIROOM_GIFT_PRODUCTS, MiniroomGiftProduct } from '../config/weddingConfig';
import { useAuth } from '../context/AuthContext';
import miniroomCleanBg from '../assets/images/miniroom_clean_full.jpg';

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

const clampPercent = (val: number, min: number, max: number) =>
  Math.round(Math.max(min, Math.min(max, val)) * 10) / 10;

const formatGiftTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${min}`;
};

const resolveGiftVisual = (giftId: string): MiniroomGiftProduct | undefined => {
  const direct = MINIROOM_GIFT_PRODUCTS.find((p) => p.id === giftId);
  if (direct) return direct;
  if (giftId === 'gift-balloon') {
    return MINIROOM_GIFT_PRODUCTS.find((p) => p.id === 'gift-heart-balloon');
  }
  if (giftId === 'gift-wreath') {
    return MINIROOM_GIFT_PRODUCTS.find((p) => p.id === 'gift-wreath-pink');
  }
  return undefined;
};

export const Miniroom: React.FC<MiniroomProps> = ({
  guestbookCount,
  onGoToGuestbook,
  onShowToast,
}) => {
  const { isAdmin } = useAuth();
  const roomRef = useRef<HTMLDivElement>(null);

  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [totalHeartsSent, setTotalHeartsSent] = useState<number>(() =>
    AcornService.getCachedMiniroomHearts()
  );
  const [displayedGifts, setDisplayedGifts] = useState<DisplayedMiniroomGift[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResettingHearts, setIsResettingHearts] = useState(false);

  // Admin gift positioning & sender list state
  const [isEditingPositions, setIsEditingPositions] = useState(false);
  const [showGiftSenderList, setShowGiftSenderList] = useState(false);
  const [draggingGiftId, setDraggingGiftId] = useState<string | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const dragRef = useRef<{
    giftId: string;
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    currentPosX: number;
    currentPosY: number;
    hasMoved: boolean;
    roomRect: DOMRect;
  } | null>(null);

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

  useEffect(() => {
    if (!isAdmin) {
      if (isEditingPositions) {
        setIsEditingPositions(false);
        setDraggingGiftId(null);
        dragRef.current = null;
      }
      if (showGiftSenderList) {
        setShowGiftSenderList(false);
      }
    }
  }, [isAdmin, isEditingPositions, showGiftSenderList]);

  // Global pointer tracking during gift drag
  useEffect(() => {
    if (!draggingGiftId) return;

    const handlePointerMove = (ev: PointerEvent) => {
      const state = dragRef.current;
      if (!state || !state.roomRect.width || !state.roomRect.height) return;

      const deltaPxX = ev.clientX - state.startClientX;
      const deltaPxY = ev.clientY - state.startClientY;
      if (!state.hasMoved && Math.hypot(deltaPxX, deltaPxY) > 2) {
        state.hasMoved = true;
      }

      const dxPct = (deltaPxX / state.roomRect.width) * 100;
      const dyPct = (deltaPxY / state.roomRect.height) * 100;
      const nextX = clampPercent(state.startPosX + dxPct, 4, 96);
      const nextY = clampPercent(state.startPosY + dyPct, 7, 93);

      state.currentPosX = nextX;
      state.currentPosY = nextY;

      setOptimisticPositions((prev) => ({
        ...prev,
        [state.giftId]: { x: nextX, y: nextY },
      }));
    };

    const handlePointerUp = async () => {
      const state = dragRef.current;
      dragRef.current = null;
      setDraggingGiftId(null);

      if (!state || !state.hasMoved) return;

      try {
        await AcornService.updateMiniroomGiftPosition(
          state.giftId,
          state.currentPosX,
          state.currentPosY
        );
        bgmPlayer.playChime();
        onShowToast('선물 위치가 저장되었습니다 ✨');
      } catch {
        onShowToast('선물 위치 저장에 실패했습니다.');
      } finally {
        setOptimisticPositions((prev) => {
          const next = { ...prev };
          delete next[state.giftId];
          return next;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingGiftId, onShowToast]);

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditingPositions) return;

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

    bgmPlayer.playChime();

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
    if (isEditingPositions) return;
    bgmPlayer.playChime();
    const displayName = resolveGiftVisual(gift.giftId)?.name || gift.name;
    onShowToast(`🎁 ${gift.senderName}님이 선물한 '${displayName}'이(가) 진열되어 있어요!`);
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

  const handleResetSingleGiftPosition = async (e: React.MouseEvent, giftId: string) => {
    e.stopPropagation();
    try {
      await AcornService.resetMiniroomGiftPositions([giftId]);
      setOptimisticPositions((prev) => {
        const next = { ...prev };
        delete next[giftId];
        return next;
      });
      bgmPlayer.playChime();
      onShowToast('해당 선물이 기본 위치로 돌아갔습니다.');
    } catch {
      onShowToast('위치 초기화에 실패했습니다.');
    }
  };

  const handleResetAllGiftPositions = async () => {
    const customIds = displayedGifts
      .filter((g) => typeof g.posX === 'number' && typeof g.posY === 'number')
      .map((g) => g.id);
    if (customIds.length === 0) return;

    try {
      await AcornService.resetMiniroomGiftPositions(customIds);
      setOptimisticPositions({});
      bgmPlayer.playChime();
      onShowToast('모든 선물이 기본 위치로 초기화되었습니다.');
    } catch {
      onShowToast('전체 위치 초기화에 실패했습니다.');
    }
  };

  const handleGiftPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    gift: DisplayedMiniroomGift
  ) => {
    if (!isAdmin || !isEditingPositions) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!roomRef.current) return;

    e.stopPropagation();
    e.preventDefault();

    const roomRect = roomRef.current.getBoundingClientRect();
    const elRect = e.currentTarget.getBoundingClientRect();
    const opt = optimisticPositions[gift.id];

    const startPosX =
      opt?.x ??
      (typeof gift.posX === 'number'
        ? gift.posX
        : clampPercent(
            ((elRect.left + elRect.width / 2 - roomRect.left) / roomRect.width) * 100,
            4,
            96
          ));
    const startPosY =
      opt?.y ??
      (typeof gift.posY === 'number'
        ? gift.posY
        : clampPercent(
            ((elRect.top + elRect.height / 2 - roomRect.top) / roomRect.height) * 100,
            7,
            93
          ));

    dragRef.current = {
      giftId: gift.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX,
      startPosY,
      currentPosX: startPosX,
      currentPosY: startPosY,
      hasMoved: false,
      roomRect,
    };

    setOptimisticPositions((prev) => ({
      ...prev,
      [gift.id]: { x: startPosX, y: startPosY },
    }));
    setDraggingGiftId(gift.id);
  };

  const renderGiftItem = (gift: DisplayedMiniroomGift, isCustomPositioned: boolean) => {
    const prod = resolveGiftVisual(gift.giftId);
    const opt = optimisticPositions[gift.id];
    const effectiveX = opt?.x ?? gift.posX;
    const effectiveY = opt?.y ?? gift.posY;
    const isBeingDragged = draggingGiftId === gift.id;
    const hasCustomCoords = typeof effectiveX === 'number' && typeof effectiveY === 'number';

    const editOutlineClass = isEditingPositions
      ? `touch-none select-none cursor-grab active:cursor-grabbing ${
          isBeingDragged
            ? 'scale-110 ring-2 ring-[#2E8BFF] bg-[#2E8BFF]/15 rounded-md z-30'
            : 'ring-1 ring-dashed ring-[#2E8BFF]/75 bg-[#2E8BFF]/5 rounded-md hover:scale-105'
        }`
      : 'cursor-pointer transition-transform hover:-translate-y-0.5';

    const positionStyle: React.CSSProperties | undefined =
      isCustomPositioned && hasCustomCoords
        ? {
            left: `${effectiveX}%`,
            top: `${effectiveY}%`,
            transform: 'translate(-50%, -50%)',
          }
        : undefined;

    const actionButtons = isAdmin && (
      <>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => handleRemoveGift(e, gift.id)}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/95 border border-[#3B2F2F] flex items-center justify-center text-[#E03131] hover:text-red-700 cursor-pointer shadow-xs z-20"
          title="진열 선물 삭제 (관리자)"
        >
          <X className="w-2.5 h-2.5" />
        </button>
        {isEditingPositions && hasCustomCoords && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => handleResetSingleGiftPosition(e, gift.id)}
            className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#FFF3BF] border border-[#3B2F2F] flex items-center justify-center text-[#3B2F2F] hover:bg-[#FFE066] cursor-pointer shadow-xs z-20"
            title="기본 위치로 되돌리기 (관리자)"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}
      </>
    );

    const displayName = prod?.name || gift.name;
    const giftImageUrl = prod?.miniroomImageUrl || prod?.imageUrl;

    if (giftImageUrl) {
      const sizeClass =
        prod?.miniroomSizeClass ||
        (prod?.placement === 'top' ? 'w-7 h-[42px]' : 'w-12 h-[78px]');
      return (
        <div
          key={gift.id}
          onPointerDown={(e) => handleGiftPointerDown(e, gift)}
          onClick={(e) => handleGiftClick(e, gift)}
          style={positionStyle}
          title={
            isEditingPositions
              ? `드래그하여 '${displayName}' 위치 이동`
              : `${gift.senderName}님의 선물: ${displayName}`
          }
          className={`${
            isCustomPositioned ? 'absolute z-20' : 'relative'
          } pointer-events-auto group/gift ${editOutlineClass}`}
        >
          <img
            src={giftImageUrl}
            alt={displayName}
            draggable={false}
            className={`${sizeClass} object-contain select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]`}
            style={{ imageRendering: 'pixelated' }}
          />
          {actionButtons}
        </div>
      );
    }

    return (
      <div
        key={gift.id}
        onPointerDown={(e) => handleGiftPointerDown(e, gift)}
        onClick={(e) => handleGiftClick(e, gift)}
        style={positionStyle}
        title={
          isEditingPositions
            ? `드래그하여 '${displayName}' 위치 이동`
            : `${gift.senderName}님의 선물: ${displayName}`
        }
        className={`${
          isCustomPositioned ? 'absolute z-20' : 'relative'
        } pointer-events-auto group/gift bg-white/90 hover:bg-white border-2 border-[#3B2F2F] rounded-md px-1.5 py-0.5 shadow-[2px_2px_0_#3B2F2F] flex items-center gap-1 ${editOutlineClass}`}
      >
        <span className="text-base leading-none pointer-events-none">{gift.emoji}</span>
        <span className="text-[9px] font-pixel text-[#3B2F2F] max-w-[54px] truncate pointer-events-none">
          {gift.senderName}
        </span>
        {actionButtons}
      </div>
    );
  };

  const hasCustomPositionedGifts = displayedGifts.some(
    (g) => typeof g.posX === 'number' && typeof g.posY === 'number'
  );

  const customGifts = displayedGifts.filter((g) => {
    const opt = optimisticPositions[g.id];
    return Boolean(opt || (typeof g.posX === 'number' && typeof g.posY === 'number'));
  });

  const defaultTopGifts = displayedGifts
    .filter((g) => {
      const opt = optimisticPositions[g.id];
      if (opt || (typeof g.posX === 'number' && typeof g.posY === 'number')) return false;
      const prod = resolveGiftVisual(g.giftId);
      const hasImage = Boolean(prod?.miniroomImageUrl || prod?.imageUrl);
      return hasImage && prod?.placement === 'top';
    })
    .slice(-10);

  const defaultBottomGifts = displayedGifts
    .filter((g) => {
      const opt = optimisticPositions[g.id];
      if (opt || (typeof g.posX === 'number' && typeof g.posY === 'number')) return false;
      const prod = resolveGiftVisual(g.giftId);
      const hasImage = Boolean(prod?.miniroomImageUrl || prod?.imageUrl);
      return !(hasImage && prod?.placement === 'top');
    })
    .slice(-10);

  return (
    <div className="w-full space-y-2">
      {/* 4:3 Aspect Ratio Miniroom Box */}
      <div
        ref={roomRef}
        onClick={handleRoomClick}
        className={`retro-box w-full overflow-hidden relative select-none group aspect-[4/3] bg-[#f9f5ed] ${
          isEditingPositions ? 'cursor-default ring-2 ring-[#2E8BFF]' : 'cursor-pointer'
        }`}
        title={
          isEditingPositions
            ? '선물을 드래그해서 원하는 위치로 옮겨주세요'
            : '미니룸을 터치하면 축하 하트가 퐁퐁 피어나요!'
        }
      >
        {/* Pixel Art Miniroom Artwork */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={miniroomCleanBg}
            alt="재현과 하은의 싸이월드 웨딩 미니룸"
            draggable={false}
            className="block w-full h-full object-cover object-center select-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
            loading="eager"
          />

          {/* Subtle Couple Idle Bobbing Overlay Indicator */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-32 h-28 relative mt-16 animate-idle flex justify-center">
              <span className="absolute -top-3 left-6 text-xs text-[#2E8BFF] animate-pulse">✦</span>
              <span className="absolute -top-4 right-6 text-xs text-[#F4A6B7] animate-pulse">♥</span>
            </div>
          </div>
        </div>

        {/* Admin Layout Edit Mode Guide Border */}
        {isEditingPositions && (
          <div className="absolute inset-1.5 border-2 border-dashed border-[#2E8BFF]/70 rounded-lg pointer-events-none z-10" />
        )}

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

        {/* Default Top Zone Gifts (unmoved top items like Heart Balloon) */}
        {defaultTopGifts.length > 0 && (
          <div className="absolute top-9 left-3 right-3 z-10 flex flex-wrap items-start justify-center gap-2.5 pointer-events-none">
            {defaultTopGifts.map((gift) => renderGiftItem(gift, false))}
          </div>
        )}

        {/* Default Bottom Zone Gifts (unmoved bottom items like Wreaths & Emoji Gifts) */}
        {defaultBottomGifts.length > 0 && (
          <div className="absolute bottom-11 left-2.5 right-2.5 z-10 flex flex-wrap items-end justify-start gap-2 pointer-events-none">
            {defaultBottomGifts.map((gift) => renderGiftItem(gift, false))}
          </div>
        )}

        {/* Custom Positioned Gifts (placed anywhere by Admin) */}
        {customGifts.map((gift) => renderGiftItem(gift, true))}

        {/* Semi-transparent Black Speech Bubble Caption at bottom (synced with guestbook!) */}
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[90%] flex justify-center ${
            isEditingPositions ? 'pointer-events-none opacity-45' : 'pointer-events-auto'
          }`}
        >
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

      {/* Admin Gift Layout Toolbar & Gift Sender List Tab */}
      {isAdmin && (
        <div className="space-y-2">
          <div className="retro-box bg-[#FFFDF7] px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-pixel">
            <div className="flex items-center gap-1.5 text-[#3B2F2F]">
              <Move className="w-3.5 h-3.5 text-[#2E8BFF] shrink-0" />
              <span>
                {isEditingPositions
                  ? '선물을 드래그해 원하는 위치로 옮겨주세요'
                  : `선물 배치 관리 (${displayedGifts.length}개)`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {isEditingPositions && hasCustomPositionedGifts && (
                <button
                  type="button"
                  onClick={handleResetAllGiftPositions}
                  className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#666666] px-2 py-1 text-[10px] font-pixel cursor-pointer flex items-center gap-1"
                  title="모든 선물의 위치를 기본 위치로 되돌립니다"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>전체 초기화</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isEditingPositions && displayedGifts.length === 0) {
                    onShowToast('미니룸에 진열된 선물이 아직 없어요.');
                    return;
                  }
                  setIsEditingPositions((prev) => !prev);
                }}
                className={`retro-btn px-2.5 py-1 text-[10px] font-pixel cursor-pointer flex items-center gap-1 ${
                  isEditingPositions
                    ? 'bg-[#2E8BFF] hover:bg-[#1c7ed6] text-white'
                    : 'bg-[#FFF3BF] hover:bg-[#FFE066] text-[#3B2F2F]'
                }`}
              >
                {isEditingPositions ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>배치 완료</span>
                  </>
                ) : (
                  <>
                    <Move className="w-3 h-3" />
                    <span>위치 변경</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Admin Gift Sender List Tab */}
          <div className="retro-box bg-[#FFFDF7] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGiftSenderList((prev) => !prev)}
              className="w-full px-2.5 py-2 flex items-center justify-between text-[11px] font-pixel text-[#3B2F2F] hover:bg-[#FAF5EA] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#F06595] shrink-0" />
                <span>선물 보낸 사람 확인</span>
                <span className="bg-[#FFE3EC] text-[#C2255C] px-1.5 py-0.5 rounded text-[10px] border border-[#F4A6B7]">
                  {displayedGifts.length}개
                </span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#666666]">
                <span>{showGiftSenderList ? '접기' : '목록 보기'}</span>
                {showGiftSenderList ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </button>

            {showGiftSenderList && (
              <div className="border-t border-dashed border-[#D8CBB8] bg-white">
                {displayedGifts.length === 0 ? (
                  <div className="py-4 px-3 text-center text-[11px] font-body text-[#888888]">
                    아직 미니룸에 도착한 선물이 없습니다.
                  </div>
                ) : (
                  <ul className="max-h-52 overflow-y-auto divide-y divide-[#F1EAE0]">
                    {[...displayedGifts].reverse().map((gift) => {
                      const prod = resolveGiftVisual(gift.giftId);
                      const displayName = prod?.name || gift.name;
                      const timeText = formatGiftTime(gift.createdAt);
                      return (
                        <li
                          key={gift.id}
                          className="px-2.5 py-2 flex items-center justify-between gap-2 hover:bg-[#FFFDF8]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded border border-[#E5DCCB] bg-[#FAF7F0] flex items-center justify-center shrink-0 overflow-hidden">
                              {prod?.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={displayName}
                                  className="w-5 h-6 object-contain"
                                  style={{ imageRendering: 'pixelated' }}
                                />
                              ) : (
                                <span className="text-sm leading-none">{gift.emoji}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-pixel text-[11px] font-bold text-[#3B2F2F] truncate max-w-[140px]">
                                  {gift.senderName}
                                </span>
                                <span className="text-[10px] font-body text-[#666666]">
                                  · {displayName}
                                </span>
                              </div>
                              {timeText && (
                                <div className="text-[10px] font-pixel text-[#999999]">
                                  {timeText}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveGift(e, gift.id)}
                            className="p-1.5 text-[#999999] hover:text-[#E03131] hover:bg-[#FFF5F5] rounded transition-colors cursor-pointer shrink-0"
                            title={`${gift.senderName}님의 선물 삭제`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
