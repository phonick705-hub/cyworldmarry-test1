import React from 'react';
import { Mail, Camera, BookOpen, MessageSquare, Users, Store } from 'lucide-react';
import { bgmPlayer } from '../utils/soundSynthesizer';

export type TabType = 'invitation' | 'photos' | 'diary' | 'guestbook' | 'ilchon' | 'store';

interface TabBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  guestbookCount: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onChangeTab,
  guestbookCount,
}) => {
  const tabs = [
    { id: 'invitation' as TabType, label: '초대장', icon: Mail },
    { id: 'photos' as TabType, label: '사진첩', icon: Camera },
    { id: 'diary' as TabType, label: '다이어리', icon: BookOpen },
    { id: 'ilchon' as TabType, label: '일촌', icon: Users },
    { id: 'guestbook' as TabType, label: '방명록', icon: MessageSquare, badge: guestbookCount },
    { id: 'store' as TabType, label: '도토리', icon: Store },
  ];

  const handleTabClick = (tabId: TabType) => {
    bgmPlayer.playChime();
    onChangeTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="하단 네비게이션"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-1.5 pb-2 sm:pb-3"
    >
      <div className="w-full max-w-[430px] pointer-events-auto bg-white/95 backdrop-blur-md border-3 border-[#3B2F2F] rounded-xl shadow-[4px_4px_0_#3B2F2F] p-1 flex items-center justify-between gap-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 min-h-[46px] py-1 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-[#2E8BFF] text-white shadow-[2px_2px_0_#3B2F2F] -translate-y-0.5'
                  : 'text-[#555555] hover:text-[#3B2F2F] hover:bg-[#FAF7F0] active:scale-95'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[9px] font-pixel font-bold px-1 rounded-full leading-tight ${
                      isActive ? 'bg-[#FFD43B] text-[#3B2F2F]' : 'bg-[#2E8BFF] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[9.5px] sm:text-[10px] font-pixel mt-1 tracking-tighter leading-none ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
