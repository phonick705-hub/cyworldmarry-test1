import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, LogOut, ShieldAlert, Check, X } from 'lucide-react';
import { WEDDING_CONFIG } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';
import { useAuth } from '../context/AuthContext';
import { WeddingDataService } from '../services/weddingDataService';

interface HeaderProps {
  onShowToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowToast }) => {
  const { isAdmin, currentUser, logout } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [todayWord, setTodayWord] = useState<string>(WEDDING_CONFIG.miniroom.todayWord);
  const [isEditingWord, setIsEditingWord] = useState(false);
  const [editInput, setEditInput] = useState<string>(WEDDING_CONFIG.miniroom.todayWord);
  const [isSavingWord, setIsSavingWord] = useState(false);

  // Subscribe to BGM player state
  useEffect(() => {
    const unsubscribe = bgmPlayer.subscribe((playing) => {
      setIsPlaying(playing);
    });
    return unsubscribe;
  }, []);

  // Real-time synchronization of "오늘의 한마디" from Firestore
  useEffect(() => {
    const unsubscribe = WeddingDataService.subscribeInvitationConfig((remoteConfig) => {
      if (remoteConfig?.todayWord) {
        setTodayWord(remoteConfig.todayWord);
        setEditInput(remoteConfig.todayWord);
      } else if (remoteConfig?.miniroom?.todayWord) {
        setTodayWord(remoteConfig.miniroom.todayWord);
        setEditInput(remoteConfig.miniroom.todayWord);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleToggleBgm = () => {
    const newState = bgmPlayer.toggle();
    if (newState) {
      onShowToast('♬ BGM이 재생됩니다');
    } else {
      onShowToast('BGM이 일시정지되었습니다');
    }
  };

  const handleLogout = async () => {
    await logout();
    onShowToast('관리자 모드에서 로그아웃했습니다.');
  };

  const handleStartEditWord = () => {
    setEditInput(todayWord);
    setIsEditingWord(true);
  };

  const handleCancelEditWord = () => {
    setEditInput(todayWord);
    setIsEditingWord(false);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInput.trim()) return;

    setIsSavingWord(true);
    try {
      const trimmed = editInput.trim();
      await WeddingDataService.updateInvitationConfig({
        todayWord: trimmed,
        miniroom: {
          ...WEDDING_CONFIG.miniroom,
          todayWord: trimmed,
        },
      });
      setTodayWord(trimmed);
      setIsEditingWord(false);
      bgmPlayer.playChime();
      onShowToast('오늘의 한마디가 변경되었습니다 ✨');
    } catch {
      onShowToast('오늘의 한마디 저장에 실패했습니다.');
    } finally {
      setIsSavingWord(false);
    }
  };

  return (
    <header className="w-full space-y-2">
      {/* Admin Mode Floating Indicator (Visible ONLY when isAdmin is true) */}
      {isAdmin && (
        <div className="retro-box bg-[#FFF3BF] border-2 border-[#3B2F2F] px-3 py-1.5 flex items-center justify-between text-xs font-pixel shadow-[2px_2px_0_#3B2F2F] animate-fadeIn">
          <div className="flex items-center gap-1.5 text-[#D9480F]">
            <ShieldAlert className="w-4 h-4 text-[#D9480F]" />
            <span className="font-bold">👑 관리자 모드 활성화됨</span>
            <span className="text-[10px] text-[#666666] hidden sm:inline">({currentUser?.email})</span>
          </div>
          <button
            onClick={handleLogout}
            className="retro-btn bg-white hover:bg-[#FFF0F4] text-[#3B2F2F] px-2 py-0.5 text-[10px] flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3 h-3 text-[#E03131]" />
            <span>로그아웃</span>
          </button>
        </div>
      )}

      {/* 2000s Cyworld Minihompy Top Stats & Jukebox Player Bar */}
      <div className="retro-box-cream px-3 py-2 flex items-center justify-between gap-2 text-xs">
        {/* Visitors Counter */}
        <div className="flex items-center gap-1.5 font-pixel text-[#3B2F2F]">
          <span className="text-[#E03131] font-bold">TODAY</span>
          <span className="font-bold text-[#E03131]">{WEDDING_CONFIG.miniroom.todayVisits}</span>
          <span className="text-[#888888]">|</span>
          <span className="text-[#666666]">TOTAL</span>
          <span className="text-[#333333] font-medium">{WEDDING_CONFIG.miniroom.totalVisits.toLocaleString()}</span>
        </div>

        {/* Retro BGM Player Widget */}
        <div className="flex items-center gap-1.5 bg-[#FAF7F0] border border-[#3B2F2F] rounded px-2 py-1 shadow-[2px_2px_0_#3B2F2F]">
          <Music className={`w-3.5 h-3.5 text-[#2E8BFF] ${isPlaying ? 'animate-bounce' : ''}`} />
          
          <button
            onClick={handleToggleBgm}
            aria-label={isPlaying ? 'BGM 일시정지' : 'BGM 재생'}
            className="flex items-center gap-1 text-[11px] font-pixel text-[#3B2F2F] hover:text-[#2E8BFF] transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 text-[#2E8BFF] fill-current" />
            ) : (
              <Play className="w-3 h-3 text-[#2E8BFF] fill-current" />
            )}
            <span className="max-w-[125px] truncate font-pixel">BGM {isPlaying ? 'ON' : 'OFF'}</span>
          </button>

          {/* Equalizer Wave Bars */}
          <div className="flex items-end gap-0.5 h-3 ml-0.5">
            <span className={`w-0.5 bg-[#2E8BFF] rounded-xs transition-all ${isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
            <span className={`w-0.5 bg-[#F4A6B7] rounded-xs transition-all ${isPlaying ? 'h-2 animate-bounce' : 'h-1.5'}`} />
            <span className={`w-0.5 bg-[#2E8BFF] rounded-xs transition-all ${isPlaying ? 'h-3.5 animate-pulse' : 'h-1'}`} />
          </div>

          <button
            onClick={handleToggleBgm}
            className="text-[#666666] hover:text-[#3B2F2F] ml-0.5 cursor-pointer"
            title="소리 켜기/끄기"
          >
            {isPlaying ? <Volume2 className="w-3 h-3 text-[#2E8BFF]" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Minihompy Title & Couple Label */}
      <div className="flex items-center justify-between px-1">
        <h1 className="font-pixel text-base font-bold text-[#3B2F2F] flex items-center gap-1.5">
          <span>{WEDDING_CONFIG.groom.name}</span>
          <span className="text-[#F4A6B7] text-sm animate-pulse">♥</span>
          <span>{WEDDING_CONFIG.bride.name}의 미니홈피</span>
        </h1>
        <div className="text-[11px] font-pixel text-[#666666] bg-[#FFFFFF] border border-[#3B2F2F] px-1.5 py-0.5 rounded shadow-[1px_1px_0_#3B2F2F]">
          Since {WEDDING_CONFIG.miniroom.relationStartDate.replace(/-/g, '.')}
        </div>
      </div>

      {/* 오늘의 한마디 Bar: ONLY editable in Admin Mode */}
      <div className="retro-box bg-white px-3 py-2 flex items-center gap-2 text-sm shadow-[3px_3px_0_#3B2F2F]">
        <div className="bg-[#EBF4FF] border border-[#2E8BFF] text-[#2E8BFF] px-2 py-0.5 rounded text-xs font-pixel font-bold shrink-0 select-none">
          오늘의 한마디
        </div>
        
        {/* If Admin Mode and Editing */}
        {isAdmin && isEditingWord ? (
          <form onSubmit={handleSaveWord} className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className="flex-1 text-xs font-pixel px-2 py-1 border-2 border-[#2E8BFF] rounded bg-[#FFFDF9] outline-none"
              autoFocus
              maxLength={35}
              placeholder="오늘의 한마디 입력"
            />
            <button
              type="submit"
              disabled={isSavingWord}
              className="retro-btn bg-[#2E8BFF] text-white px-2 py-1 text-[11px] font-pixel shrink-0 flex items-center gap-0.5 cursor-pointer shadow-xs"
              title="저장"
            >
              <Check className="w-3 h-3" />
              <span>저장</span>
            </button>
            <button
              type="button"
              onClick={handleCancelEditWord}
              className="retro-btn bg-gray-200 text-[#3B2F2F] px-1.5 py-1 text-[11px] font-pixel shrink-0 cursor-pointer shadow-xs"
              title="취소"
            >
              <X className="w-3 h-3" />
            </button>
          </form>
        ) : (
          <div className="flex-1 flex items-center justify-between gap-1 overflow-hidden">
            {/* Pure static text for regular visitors, no cursor pointer, no hover */}
            <span className="font-pixel text-xs sm:text-sm text-[#3B2F2F] truncate select-text">
              {todayWord}
            </span>

            {/* Admin only edit trigger button */}
            {isAdmin && (
              <button
                onClick={handleStartEditWord}
                className="retro-btn bg-[#FFF3BF] hover:bg-[#FFE066] text-[#D9480F] px-1.5 py-0.5 text-[10px] font-pixel shrink-0 flex items-center gap-1 cursor-pointer border border-[#D9480F]"
                title="오늘의 한마디 수정 (관리자 전용)"
              >
                <span>✏️</span>
                <span>수정</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
