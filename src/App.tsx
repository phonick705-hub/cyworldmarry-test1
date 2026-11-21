import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Heart, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { Miniroom } from './components/Miniroom';
import { InvitationCard } from './components/InvitationCard';
import { PhotoAlbum } from './components/PhotoAlbum';
import { Diary } from './components/Diary';
import { Guestbook } from './components/Guestbook';
import { IlchonList } from './components/IlchonList';
import { DotoriStore } from './components/DotoriStore';
import { TabBar, TabType } from './components/TabBar';
import { Toast } from './components/Toast';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WeddingDataService } from './services/weddingDataService';
import { WEDDING_CONFIG } from './config/weddingConfig';
import { bgmPlayer } from './utils/soundSynthesizer';

function MainApp() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('invitation');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [guestbookCount, setGuestbookCount] = useState<number>(0);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 2500);
  };

  useEffect(() => {
    if (isAdmin) {
      WeddingDataService.cleanupSampleGuestbookEntries();
    }
  }, [isAdmin]);

  useEffect(() => {
    // 1. Check and seed initial Firestore data if empty
    WeddingDataService.autoSeedIfEmpty();

    // 2. Realtime listener for guestbook count synchronization
    const unsubscribe = WeddingDataService.subscribeGuestbook((items) => {
      setGuestbookCount(items.length);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleShare = () => {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      navigator.share({
        title: `${WEDDING_CONFIG.groom.name} ♥ ${WEDDING_CONFIG.bride.name}의 결혼식에 초대합니다`,
        text: `싸이월드 미니홈피 감성의 모바일 청첩장\n일시: ${WEDDING_CONFIG.ceremony.dateDisplay}\n장소: ${WEDDING_CONFIG.ceremony.venueName}`,
        url,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(url);
        showToast('청첩장 링크가 복사되었습니다! 💌');
      });
    } else {
      navigator.clipboard.writeText(url);
      showToast('청첩장 링크가 복사되었습니다! 💌');
    }
    bgmPlayer.playChime();
  };

  return (
    <div className="min-h-screen bg-[#e8decb] text-[#3B2F2F] flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4">
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Admin Login Modal (Triggered via secret 5 taps or /admin / #admin) */}
      <AdminLoginModal onShowToast={showToast} />

      {/* Main Container (Mobile First: max-w-[430px] centered) */}
      <main className="w-full max-w-[430px] min-h-screen sm:min-h-0 bg-[#F5EFE4] bg-grid-paper border-0 sm:border-4 border-[#3B2F2F] sm:rounded-2xl sm:shadow-[8px_8px_0_#3B2F2F] relative pb-24 flex flex-col">
        
        {/* Retro Header Screen Frame Top Tab on desktop */}
        <div className="hidden sm:flex items-center justify-between px-4 py-2 border-b-3 border-[#3B2F2F] bg-[#3B2F2F] text-[#F5EFE4] font-pixel text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FCC419]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#51CF66]" />
            <span className="ml-1 tracking-wider text-[11px]">CYWORLD WEDDING v2027</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#2E8BFF]">
            <Sparkles className="w-3 h-3 text-[#FFD43B]" />
            <span>행복지수 100%</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3.5 sm:p-4 space-y-4 flex-1">
          {/* Header Component (Stats, Mini-Jukebox, Today Word, Admin status badge) - No acorn badge here per requirements */}
          <Header onShowToast={showToast} />

          {/* Animated Tab Content Body */}
          <AnimatePresence mode="wait">
            {activeTab === 'invitation' && (
              <motion.div
                key="invitation"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* 4:3 Aspect Ratio Pixel Miniroom */}
                <Miniroom
                  guestbookCount={guestbookCount}
                  onGoToGuestbook={() => setActiveTab('guestbook')}
                  onShowToast={showToast}
                />

                {/* 📖 초대장 Card with Accordion, Map, Contact, Accounts, Secret Admin Tap & Modal */}
                <InvitationCard onShowToast={showToast} />
              </motion.div>
            )}

            {activeTab === 'photos' && (
              <motion.div
                key="photos"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <PhotoAlbum onShowToast={showToast} />
              </motion.div>
            )}

            {activeTab === 'diary' && (
              <motion.div
                key="diary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Diary onShowToast={showToast} />
              </motion.div>
            )}

            {activeTab === 'guestbook' && (
              <motion.div
                key="guestbook"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Guestbook
                  onShowToast={showToast}
                  onGoToIlchon={() => setActiveTab('ilchon')}
                />
              </motion.div>
            )}

            {activeTab === 'ilchon' && (
              <motion.div
                key="ilchon"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <IlchonList
                  onGoToGuestbook={() => setActiveTab('guestbook')}
                  onGoToStore={() => setActiveTab('store')}
                  onShowToast={showToast}
                />
              </motion.div>
            )}

            {/* 도토리 상점 Tab */}
            {activeTab === 'store' && (
              <motion.div
                key="store"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <DotoriStore
                  onNavigateTab={setActiveTab}
                  onShowToast={showToast}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Share & Copyright Bar */}
          <footer className="pt-4 pb-2 space-y-3">
            <button
              onClick={handleShare}
              className="w-full retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2.5 px-4 text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0_#3B2F2F]"
            >
              <Share2 className="w-3.5 h-3.5 text-[#2E8BFF]" />
              <span>청첩장 공유하기 (링크 복사)</span>
            </button>

            <div className="text-center space-y-1 text-[11px] font-pixel text-[#888888] pt-1">
              <div className="flex items-center justify-center gap-1">
                <span>Made with</span>
                <Heart className="w-3 h-3 text-[#F4A6B7] fill-[#F4A6B7] animate-pulse" />
                <span>for 재현 ♥ 하은</span>
              </div>
              <p className="text-[10px] text-[#aaaaaa]">
                CYWORLD MINI HOMEPAGE MOBILE WEDDING INVITATION
              </p>
            </div>
          </footer>
        </div>

        {/* Fixed Bottom Tab Bar (6 Tabs: 초대장 / 사진첩 / 다이어리 / 방명록 / 일촌 / 도토리) */}
        <TabBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          guestbookCount={guestbookCount}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
