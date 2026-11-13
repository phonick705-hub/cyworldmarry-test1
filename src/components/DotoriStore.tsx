import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Sparkles, ChevronRight, Store, Gift, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ensureAnonymousAuth } from '../services/firebase';
import { AcornService, UserAcornProfile } from '../services/acornService';
import { ACORN_CONFIG } from '../config/weddingConfig';
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
  const [showQuizModal, setShowQuizModal] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Subscribe to real-time acorn balance
    const unsubscribe = AcornService.subscribeUserAcorns(currentUser.uid, (data) => {
      setProfile(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, isAuthReady]);

  const handleClaimWelcome = async () => {
    if (isClaimingWelcome || profile.claimed?.welcome) return;
    setIsClaimingWelcome(true);
    try {
      let uid = currentUser?.uid;
      if (!uid) {
        const user = await ensureAnonymousAuth();
        uid = user.uid;
      }
      if (uid) {
        await AcornService.claimWelcomeReward(uid, onShowToast);
      }
    } catch (err) {
      console.error('Welcome reward claim failed:', err);
      onShowToast('도토리 받기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsClaimingWelcome(false);
    }
  };

  const todayStr = AcornService.getTodayString();
  const isQuizDailyLimitReached = 
    profile.quizDaily?.date === todayStr && 
    (profile.quizDaily?.earned || 0) >= ACORN_CONFIG.QUIZ_DAILY_MAX;

  const baseMissions = [
    {
      id: 'welcome',
      title: '첫 방문 입장 축하 선물',
      reward: ACORN_CONFIG.WELCOME_REWARD,
      isCompleted: !!profile.claimed?.welcome,
      actionText: null,
      onAction: null,
    },
    {
      id: 'ilchon',
      title: '소중한 인연 일촌 신청하기',
      reward: ACORN_CONFIG.ILCHON_REWARD,
      isCompleted: !!profile.claimed?.ilchon,
      actionText: '일촌 신청하러가기',
      onAction: () => onNavigateTab('ilchon'),
    },
    {
      id: 'guestbook',
      title: '신랑·신부에게 축하 방명록 남기기',
      reward: ACORN_CONFIG.GUESTBOOK_REWARD,
      isCompleted: !!profile.claimed?.guestbook,
      actionText: '방명록 쓰러가기',
      onAction: () => onNavigateTab('guestbook'),
    },
  ];

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

      {/* 1. 상단: "내 도토리 🌰 0개" 큰 잔액 카드 */}
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
          다양한 미션을 완료하고 도토리를 모아보세요!
        </p>
      </div>

      {/* 2. 중간: "도토리 모으는 방법" 목록 */}
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
          {/* Base 3 missions: Welcome, Ilchon, Guestbook */}
          {baseMissions.map((mission) => (
            <div
              key={mission.id}
              className={`p-2.5 rounded-lg border-2 border-[#3B2F2F] flex items-center justify-between gap-2 text-xs font-pixel transition-all ${
                mission.isCompleted
                  ? 'bg-[#F4FBF7] shadow-[2px_2px_0_#51CF66]'
                  : 'bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]'
              }`}
            >
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#3B2F2F] font-bold">
                    {mission.title}
                  </span>
                  <span className="bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] text-[10px] px-1.5 py-0.2 rounded">
                    +{mission.reward} 🌰
                  </span>
                </div>
                {mission.actionText && !mission.isCompleted && mission.onAction && (
                  <button
                    onClick={mission.onAction}
                    className="text-[11px] text-[#2E8BFF] hover:underline flex items-center gap-0.5 font-body pt-0.5 cursor-pointer"
                  >
                    <span>{mission.actionText}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Badge / Action Button */}
              <div className="shrink-0">
                {mission.id === 'welcome' ? (
                  mission.isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#2B8A3E] font-bold bg-[#EBFBEE] border border-[#B2F2BB] px-2 py-1 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#40C057]" />
                      <span>도토리 수령</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleClaimWelcome}
                      disabled={isClaimingWelcome}
                      className="retro-btn bg-[#2E8BFF] hover:bg-[#1C74E0] disabled:opacity-60 text-white px-2.5 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>{isClaimingWelcome ? '받는 중...' : '도토리 받기'}</span>
                    </button>
                  )
                ) : mission.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#2B8A3E] font-bold bg-[#EBFBEE] border border-[#B2F2BB] px-2 py-1 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#40C057]" />
                    <span>완료됨</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#868E96] bg-[#F1F3F5] border border-[#CED4DA] px-2 py-1 rounded">
                    <Clock className="w-3.5 h-3.5 text-[#ADB5BD]" />
                    <span>미완료</span>
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* 4. 커플 퀴즈 풀기 항목 */}
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
                  커플 퀴즈 풀기 +5 🌰
                </span>
                <span className="bg-[#EBF4FF] text-[#2E8BFF] border border-[#B6D4FE] text-[10px] px-1.5 py-0.2 rounded font-bold">
                  매일 퀴즈
                </span>
              </div>
              <button
                onClick={() => setShowQuizModal(true)}
                className="text-[11px] text-[#2E8BFF] hover:underline flex items-center gap-0.5 font-body pt-0.5 cursor-pointer"
              >
                <span>게임하러 가기</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Status Button: "도전하기" or "오늘 완료" */}
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
        </div>
      </div>

      {/* 3. 하단: "상품 준비 중이에요 🌿" 빈 진열대 */}
      <div className="retro-box p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <h3 className="font-pixel text-sm font-bold text-[#3B2F2F] flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#2E8BFF]" />
            <span>선물 진열대</span>
          </h3>
          <span className="text-[10px] font-pixel text-[#888888]">COMING SOON</span>
        </div>

        {/* 빈 진열장 느낌의 픽셀 감성 일러스트 박스 */}
        <div className="bg-[#FAF7F0] border-2 border-dashed border-[#dcd1be] rounded-lg p-6 text-center space-y-2.5">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EBF4FF] border border-[#2E8BFF] flex items-center justify-center text-2xl shadow-xs">
            🌿
          </div>
          <div className="space-y-1">
            <h4 className="font-pixel text-sm font-bold text-[#3B2F2F]">
              상품 준비 중이에요 🌿
            </h4>
            <p className="font-body text-xs text-[#666666] leading-relaxed max-w-xs mx-auto">
              미니홈피를 환하게 밝혀줄 예쁜 축하 화환과 특별한 아이템들이 곧 입고될 예정입니다!
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1 text-[11px] font-pixel text-[#E07A5F] bg-[#FFF5F2] py-1.5 px-3 rounded border border-[#FFD8A8] inline-flex">
            <Gift className="w-3.5 h-3.5" />
            <span>도토리를 미리 모아두시면 바로 선물할 수 있어요!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
