import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Store,
  Gift,
  Gamepad2,
  ShoppingBag,
  Frame,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AcornService, UserAcornProfile } from '../services/acornService';
import {
  ACORN_CONFIG,
  MINIROOM_GIFT_PRODUCTS,
  MiniroomGiftProduct,
} from '../config/weddingConfig';
import { TabType } from './TabBar';
import { CoupleQuizModal } from './CoupleQuizModal';

interface DotoriStoreProps {
  onNavigateTab: (tab: TabType) => void;
  onShowToast: (msg: string) => void;
}

export const DotoriStore: React.FC<DotoriStoreProps> = ({
  onNavigateTab,
  onShowToast,
}) => {
  const { currentUser, isAuthReady } = useAuth();
  const [profile, setProfile] = useState<UserAcornProfile>({
    acorns: 0,
    claimed: {},
  });
  const [loading, setLoading] = useState(true);
  const [isClaimingWelcome, setIsClaimingWelcome] = useState(false);
  const [isClaimingIlchon, setIsClaimingIlchon] = useState(false);
  const [isClaimingMiniroomGift, setIsClaimingMiniroomGift] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // Gift Shelf Purchase & Miniroom Display Modal State
  const [selectedGiftModal, setSelectedGiftModal] = useState<{
    gift: MiniroomGiftProduct;
    step: 'buy' | 'display';
  } | null>(null);
  const [senderName, setSenderName] = useState('');
  const [isProcessingGift, setIsProcessingGift] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;

    // Subscribe to real-time acorn balance (Firestore + local fallback)
    const unsubscribe = AcornService.subscribeUserAcorns(currentUser?.uid || '', (data) => {
      setProfile(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, isAuthReady]);

  const handleClaimWelcome = async () => {
    if (isClaimingWelcome || profile.claimed?.welcome) return;
    setIsClaimingWelcome(true);
    try {
      const uid = currentUser?.uid || '';
      await AcornService.claimWelcomeReward(uid, onShowToast);
    } catch (err) {
      console.error('Welcome reward claim failed:', err);
      onShowToast('도토리 받기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsClaimingWelcome(false);
    }
  };

  const handleClaimIlchon = async () => {
    if (isClaimingIlchon || profile.claimed?.ilchon || !profile.eligible?.ilchon) return;
    setIsClaimingIlchon(true);
    try {
      const uid = currentUser?.uid || '';
      await AcornService.claimIlchonReward(uid, onShowToast);
    } catch (err) {
      console.error('Ilchon reward claim failed:', err);
      onShowToast('도토리 받기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsClaimingIlchon(false);
    }
  };

  const handleClaimMiniroomGift = async () => {
    if (isClaimingMiniroomGift || profile.claimed?.miniroomGift || !profile.eligible?.miniroomGift) return;
    setIsClaimingMiniroomGift(true);
    try {
      const uid = currentUser?.uid || '';
      await AcornService.claimMiniroomGiftReward(uid, onShowToast);
    } catch (err) {
      console.error('Miniroom gift reward claim failed:', err);
      onShowToast('도토리 받기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsClaimingMiniroomGift(false);
    }
  };

  const handleScrollToShelf = () => {
    const el = document.getElementById('gift-shelf');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedGiftModal || isProcessingGift) return;
    setIsProcessingGift(true);
    try {
      const uid = currentUser?.uid || '';
      const res = await AcornService.purchaseGift(uid, selectedGiftModal.gift);
      if (!res.success) {
        onShowToast('보유한 도토리가 부족해요! 미션을 통해 도토리를 모아보세요 🌰');
        return;
      }
      onShowToast(`🛍️ '${selectedGiftModal.gift.name}' 구매 완료! 이제 미니룸에 진열해보세요.`);
      setSelectedGiftModal({ gift: selectedGiftModal.gift, step: 'display' });
    } catch (err) {
      console.error('Gift purchase failed:', err);
      onShowToast('상품 구매에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsProcessingGift(false);
    }
  };

  const handleConfirmDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGiftModal || isProcessingGift) return;
    setIsProcessingGift(true);
    try {
      const uid = currentUser?.uid || '';
      const wasAlreadyEligible = !!profile.eligible?.miniroomGift;
      await AcornService.displayGiftInMiniroom(uid, selectedGiftModal.gift, senderName);
      setSelectedGiftModal(null);
      setSenderName('');
      if (!wasAlreadyEligible && !profile.claimed?.miniroomGift) {
        onShowToast('🖼️ 미니룸에 선물이 진열되었어요! 도토리를 수령해보세요 🌰');
      } else {
        onShowToast(`🖼️ '${selectedGiftModal.gift.name}'이(가) 미니룸에 진열되었어요!`);
      }
    } catch (err) {
      console.error('Gift display failed:', err);
      onShowToast('미니룸 진열에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsProcessingGift(false);
    }
  };

  const todayStr = AcornService.getTodayString();
  const isQuizDailyLimitReached =
    profile.quizDaily?.date === todayStr &&
    (profile.quizDaily?.earned || 0) >= ACORN_CONFIG.QUIZ_DAILY_MAX;

  const isMiniroomGiftCompleted = !!profile.claimed?.miniroomGift;
  const isMiniroomGiftEligible = !!profile.eligible?.miniroomGift;
  const pendingGiftIds = profile.pendingGiftIds || [];

  return (
    <div className="w-full space-y-4 animate-fadeIn">
      {/* Full Screen Couple Quiz Overlay Modal */}
      <CoupleQuizModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onShowToast={onShowToast}
      />

      {/* Store Header Bar */}
      <div className="retro-box-cream p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌰</span>
          <div>
            <h2 className="font-pixel text-sm sm:text-base font-bold text-[#3B2F2F]">
              도토리 상점
            </h2>
            <p className="text-[11px] font-body text-[#666666]">
              싸이월드 감성 가득한 도토리 스토어
            </p>
          </div>
        </div>
        <div className="text-[11px] font-pixel text-[#E07A5F] bg-[#FFF5F2] border border-[#3B2F2F] px-2 py-0.5 rounded shadow-[1px_1px_0_#3B2F2F] flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#E07A5F]" />
          <span>CYWORLD SHOP</span>
        </div>
      </div>

      {/* 1. 상단: "내 도토리 🌰 N개" 큰 잔액 카드 */}
      <div className="retro-box bg-[#FFFDF9] p-5 text-center space-y-2 relative overflow-hidden shadow-[4px_4px_0_#3B2F2F]">
        {/* Subtle decorative background acorn icon */}
        <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 select-none pointer-events-none">
          🌰
        </div>

        <div className="text-xs font-pixel text-[#888888] flex items-center justify-center gap-1">
          <span>내 지갑 속</span>
          <span className="font-bold text-[#3B2F2F]">보유 도토리</span>
        </div>

        <div className="flex items-center justify-center gap-2 py-1">
          <span className="text-3xl sm:text-4xl">🌰</span>
          <span className="font-pixel text-3xl sm:text-4xl font-bold text-[#3B2F2F] tracking-tight">
            {loading ? '...' : profile.acorns.toLocaleString()}
          </span>
          <span className="font-pixel text-base sm:text-lg text-[#666666] self-end mb-1">
            개
          </span>
        </div>

        <p className="font-body text-[11px] text-[#666666]">
          미션을 완료하고 도토리를 모아 미니룸에 예쁜 선물을 보내보세요!
        </p>
      </div>

      {/* 2. 중간: "도토리 모으는 방법" 목록 (4개 고정 순서) */}
      <div className="retro-box p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <h3 className="font-pixel text-sm font-bold text-[#3B2F2F] flex items-center gap-1.5">
            <span>📋</span>
            <span>도토리 모으는 방법</span>
          </h3>
          <span className="font-pixel text-[10px] text-[#2E8BFF]">
            각 미션 1회 적립 · 퀴즈는 하루 최대 20🌰
          </span>
        </div>

        <div className="space-y-2">
          {/* 1) 첫 방문 감사 선물 */}
          <div
            className={`p-2.5 rounded-lg border-2 border-[#3B2F2F] flex items-center justify-between gap-2 text-xs font-pixel transition-all ${
              profile.claimed?.welcome
                ? 'bg-[#F4FBF7] shadow-[2px_2px_0_#51CF66]'
                : 'bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]'
            }`}
          >
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#3B2F2F] font-bold">
                  첫 방문 감사 선물
                </span>
                <span className="bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] text-[10px] px-1.5 py-0.2 rounded">
                  +{ACORN_CONFIG.WELCOME_REWARD} 🌰
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {profile.claimed?.welcome ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 text-[11px] font-pixel text-[#868E96] bg-[#E9ECEF] border border-[#CED4DA] px-2.5 py-1 rounded cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#868E96]" />
                  <span>도토리 수령</span>
                </button>
              ) : (
                <button
                  onClick={handleClaimWelcome}
                  disabled={isClaimingWelcome}
                  className="retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] disabled:opacity-60 text-white px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{isClaimingWelcome ? '받는 중...' : '도토리 받기'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 2) 소중한 인연 일촌 신청하기 */}
          <div
            className={`p-2.5 rounded-lg border-2 border-[#3B2F2F] flex items-center justify-between gap-2 text-xs font-pixel transition-all ${
              profile.claimed?.ilchon
                ? 'bg-[#F4FBF7] shadow-[2px_2px_0_#51CF66]'
                : 'bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]'
            }`}
          >
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#3B2F2F] font-bold">
                  소중한 인연 일촌 신청하기
                </span>
                <span className="bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] text-[10px] px-1.5 py-0.2 rounded">
                  +{ACORN_CONFIG.ILCHON_REWARD} 🌰
                </span>
              </div>
              {!profile.claimed?.ilchon && !profile.eligible?.ilchon && (
                <button
                  onClick={() => onNavigateTab('ilchon')}
                  className="text-[11px] text-[#2E8BFF] hover:underline flex items-center gap-0.5 font-body pt-0.5 cursor-pointer"
                >
                  <span>일촌 신청하러가기</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="shrink-0">
              {profile.claimed?.ilchon ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 text-[11px] font-pixel text-[#868E96] bg-[#E9ECEF] border border-[#CED4DA] px-2.5 py-1 rounded cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#868E96]" />
                  <span>도토리 수령</span>
                </button>
              ) : profile.eligible?.ilchon ? (
                <button
                  onClick={handleClaimIlchon}
                  disabled={isClaimingIlchon}
                  className="retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] disabled:opacity-60 text-white px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{isClaimingIlchon ? '받는 중...' : '도토리 받기'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 text-[11px] text-[#868E96] bg-[#E9ECEF] border border-[#CED4DA] px-2.5 py-1 rounded cursor-not-allowed opacity-75"
                >
                  <Gift className="w-3.5 h-3.5 text-[#ADB5BD]" />
                  <span>도토리 받기</span>
                </button>
              )}
            </div>
          </div>

          {/* 3) 커플 퀴즈 풀기 */}
          <div
            className={`p-2.5 rounded-lg border-2 border-[#3B2F2F] flex items-center justify-between gap-2 text-xs font-pixel transition-all ${
              isQuizDailyLimitReached
                ? 'bg-[#F4FBF7] shadow-[2px_2px_0_#51CF66]'
                : 'bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]'
            }`}
          >
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#3B2F2F] font-bold">
                  커플 퀴즈 풀기
                </span>
                <span className="bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] text-[10px] px-1.5 py-0.2 rounded">
                  최대 +{ACORN_CONFIG.QUIZ_DAILY_MAX} 🌰
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {isQuizDailyLimitReached ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#2B8A3E] font-bold bg-[#EBFBEE] border border-[#B2F2BB] px-2 py-1 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#40C057]" />
                  <span>오늘 완료</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowQuizModal(true)}
                  className="retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] text-white px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>도전하기</span>
                </button>
              )}
            </div>
          </div>

          {/* 4) 미니룸에 선물 보내기 */}
          <div
            className={`p-2.5 rounded-lg border-2 border-[#3B2F2F] flex items-center justify-between gap-2 text-xs font-pixel transition-all ${
              isMiniroomGiftCompleted
                ? 'bg-[#F4FBF7] shadow-[2px_2px_0_#51CF66]'
                : 'bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]'
            }`}
          >
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#3B2F2F] font-bold">
                  미니룸에 선물 보내기
                </span>
                <span className="bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] text-[10px] px-1.5 py-0.2 rounded">
                  +{ACORN_CONFIG.MINIROOM_GIFT_REWARD} 🌰
                </span>
              </div>
              {!isMiniroomGiftCompleted && !isMiniroomGiftEligible && (
                <button
                  onClick={handleScrollToShelf}
                  className="text-[11px] text-[#2E8BFF] hover:underline flex items-center gap-0.5 font-body pt-0.5 cursor-pointer"
                >
                  <span>선물 진열대에서 구매 후 진열하기</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="shrink-0">
              {isMiniroomGiftCompleted ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 text-[11px] font-pixel text-[#868E96] bg-[#E9ECEF] border border-[#CED4DA] px-2.5 py-1 rounded cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#868E96]" />
                  <span>도토리 수령</span>
                </button>
              ) : isMiniroomGiftEligible ? (
                <button
                  onClick={handleClaimMiniroomGift}
                  disabled={isClaimingMiniroomGift}
                  className="retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] disabled:opacity-60 text-white px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{isClaimingMiniroomGift ? '받는 중...' : '도토리 받기'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 text-[11px] text-[#868E96] bg-[#E9ECEF] border border-[#CED4DA] px-2.5 py-1 rounded cursor-not-allowed opacity-75"
                >
                  <Gift className="w-3.5 h-3.5 text-[#ADB5BD]" />
                  <span>도토리 받기</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 하단: 선물 진열대 (상품 구매 및 미니룸 진열) */}
      <div id="gift-shelf" className="retro-box p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <h3 className="font-pixel text-sm font-bold text-[#3B2F2F] flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#2E8BFF]" />
            <span>선물 진열대</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('invitation')}
            className="text-[11px] font-pixel text-[#2E8BFF] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>미니룸 구경가기</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <p className="font-body text-[11px] text-[#666666] leading-relaxed">
          도토리로 축하 선물을 구매하고 미니룸에 직접 진열해보세요! 진열까지 완료하면 위의 <strong className="text-[#3B2F2F]">미니룸에 선물 보내기</strong> 도토리를 받을 수 있어요.
        </p>

        {/* Gift Items Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {MINIROOM_GIFT_PRODUCTS.map((gift) => {
            const hasPendingDisplay = pendingGiftIds.includes(gift.id);
            const canAfford = profile.acorns >= gift.price;

            return (
              <div
                key={gift.id}
                className={`rounded-lg border-2 border-[#3B2F2F] p-2.5 flex flex-col justify-between gap-2 transition-all ${
                  hasPendingDisplay
                    ? 'bg-[#FFF9DB] shadow-[2px_2px_0_#FCC419]'
                    : 'bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <div className="w-10 h-10 rounded-lg bg-white border-2 border-[#3B2F2F] flex items-center justify-center text-2xl shadow-[1px_1px_0_#3B2F2F] shrink-0 overflow-hidden p-1">
                      {gift.imageUrl ? (
                        <img
                          src={gift.imageUrl}
                          alt={gift.name}
                          className="w-full h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        gift.emoji
                      )}
                    </div>
                    <span className="font-pixel text-[10px] font-bold bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] px-1.5 py-0.5 rounded">
                      🌰 {gift.price}개
                    </span>
                  </div>

                  <div>
                    <h4 className="font-pixel text-xs font-bold text-[#3B2F2F]">
                      {gift.name}
                    </h4>
                    <p className="font-body text-[10px] text-[#666666] leading-snug mt-0.5">
                      {gift.description}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-1">
                  {hasPendingDisplay ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSenderName('');
                        setSelectedGiftModal({ gift, step: 'display' });
                      }}
                      className="w-full retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] text-white py-1.5 px-2 text-[11px] font-pixel flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Frame className="w-3.5 h-3.5" />
                      <span>미니룸에 진열하기</span>
                    </button>
                  ) : canAfford ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSenderName('');
                        setSelectedGiftModal({ gift, step: 'buy' });
                      }}
                      className="w-full retro-btn bg-[#3B2F2F] hover:bg-[#2a2121] text-white py-1.5 px-2 text-[11px] font-pixel flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#FFD43B]" />
                      <span>구매하기</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-1.5 px-2 rounded text-[11px] font-pixel text-[#868E96] bg-[#E9ECEF] border border-[#CED4DA] cursor-not-allowed"
                    >
                      도토리 부족 ({gift.price}개)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase & Miniroom Display Modal */}
      {selectedGiftModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="retro-box bg-white max-w-xs w-full p-4 space-y-3.5 shadow-[6px_6px_0_#2E8BFF]">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 font-pixel text-xs font-bold text-[#3B2F2F]">
                {selectedGiftModal.step === 'buy' ? (
                  <>
                    <ShoppingBag className="w-4 h-4 text-[#2E8BFF]" />
                    <span>선물 구매 확인</span>
                  </>
                ) : (
                  <>
                    <Frame className="w-4 h-4 text-[#2E8BFF]" />
                    <span>미니룸에 선물 진열하기</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedGiftModal(null)}
                className="text-[#888888] hover:text-[#3B2F2F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#FAF7F0] border-2 border-[#3B2F2F] rounded-lg p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border-2 border-[#3B2F2F] flex items-center justify-center text-3xl shrink-0 overflow-hidden p-1">
                {selectedGiftModal.gift.imageUrl ? (
                  <img
                    src={selectedGiftModal.gift.imageUrl}
                    alt={selectedGiftModal.gift.name}
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  selectedGiftModal.gift.emoji
                )}
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="font-pixel font-bold text-[#3B2F2F]">
                  {selectedGiftModal.gift.name}
                </div>
                <div className="font-body text-[11px] text-[#666666]">
                  {selectedGiftModal.gift.description}
                </div>
                <div className="font-pixel text-[11px] text-[#D9480F] font-bold">
                  가격: 🌰 {selectedGiftModal.gift.price}개
                </div>
              </div>
            </div>

            {selectedGiftModal.step === 'buy' ? (
              <div className="space-y-3">
                <div className="text-[11px] font-body text-[#555555] text-center bg-[#EBF4FF] border border-[#2E8BFF] rounded p-2">
                  도토리 <strong className="text-[#2E8BFF]">{selectedGiftModal.gift.price}개</strong>를 사용해 구매할까요?
                  <br />
                  구매 후 <strong>미니룸에 진열</strong>까지 완료하면 미션 도토리를 받을 수 있어요!
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGiftModal(null)}
                    className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 text-xs font-pixel cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPurchase}
                    disabled={isProcessingGift}
                    className="retro-btn-blue flex-2 py-2 text-xs font-pixel cursor-pointer"
                  >
                    {isProcessingGift ? '구매 중...' : `구매하기 (🌰 ${selectedGiftModal.gift.price}개)`}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmDisplay} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-pixel text-[#3B2F2F]">
                    보내는 분 이름 <span className="text-[#888888] font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="예: 민석 (비우면 '축하 하객'으로 표시)"
                    maxLength={20}
                    className="w-full text-xs font-pixel px-2.5 py-2 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGiftModal(null)}
                    className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 text-xs font-pixel cursor-pointer"
                  >
                    나중에
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingGift}
                    className="retro-btn-blue flex-2 py-2 text-xs font-pixel cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Frame className="w-3.5 h-3.5" />
                    <span>{isProcessingGift ? '진열 중...' : '미니룸에 진열하기'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
