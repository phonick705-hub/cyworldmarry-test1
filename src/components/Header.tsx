import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, LogOut, ShieldAlert, Check, X, UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { WEDDING_CONFIG, ADMIN_EMAILS } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';
import { useAuth } from '../context/AuthContext';
import { WeddingDataService } from '../services/weddingDataService';
import { AdminService, AdminAccountEntry } from '../services/adminService';

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

  // Admin account management state
  const [showAdminManageModal, setShowAdminManageModal] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccountEntry[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminNote, setNewAdminNote] = useState('');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

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

  // Subscribe to dynamically added admin accounts when logged in as admin
  useEffect(() => {
    if (!isAdmin) {
      setAdminAccounts([]);
      setShowAdminManageModal(false);
      return;
    }
    const unsubscribe = AdminService.subscribeAdminAccounts((accounts) => {
      setAdminAccounts(accounts);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleToggleBgm = () => {
    const newState = bgmPlayer.toggle();
    if (newState) {
      onShowToast('♬ BGM이 재생됩니다');
    } else {
      onShowToast('BGM이 일시정지되었습니다');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onShowToast('관리자 모드에서 로그아웃했습니다.');
    } catch {
      onShowToast('로그아웃 처리 중 오류가 발생했습니다.');
    }
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
        <div className="retro-box bg-[#FFF3BF] border-2 border-[#3B2F2F] px-3 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-xs font-pixel shadow-[2px_2px_0_#3B2F2F] animate-fadeIn">
          <div className="flex items-center gap-1.5 text-[#D9480F] min-w-0">
            <ShieldAlert className="w-4 h-4 text-[#D9480F] shrink-0" />
            <span className="font-bold truncate">👑 관리자 모드</span>
            <span className="text-[10px] text-[#666666] hidden sm:inline truncate">({currentUser?.email})</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => {
                setAdminError(null);
                setShowAdminManageModal(true);
              }}
              className="retro-btn bg-[#EBF4FF] hover:bg-[#D0EBFF] text-[#1971C2] px-2 py-0.5 text-[10px] flex items-center gap-1 cursor-pointer"
              title="추가 관리자 계정 등록 및 관리"
            >
              <UserPlus className="w-3 h-3" />
              <span>관리자 추가</span>
            </button>
            <button
              onClick={handleLogout}
              className="retro-btn bg-white hover:bg-[#FFF0F4] text-[#3B2F2F] px-2 py-0.5 text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3 text-[#E03131]" />
              <span>로그아웃</span>
            </button>
          </div>
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

      {/* Admin Accounts Management Modal */}
      {isAdmin && showAdminManageModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3.5 shadow-[6px_6px_0_#2E8BFF]">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 font-pixel text-sm font-bold text-[#3B2F2F]">
                <ShieldCheck className="w-4 h-4 text-[#2E8BFF]" />
                <span>관리자 계정 관리</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminManageModal(false)}
                className="text-[#888888] hover:text-[#3B2F2F] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Admins List */}
            <div className="space-y-2 text-xs">
              <div className="font-pixel text-[11px] font-bold text-[#3B2F2F]">
                등록된 관리자 목록
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                {/* Primary Root Admin */}
                <div className="bg-[#FFF9DB] border border-[#FCC419] rounded px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-pixel text-[11px] font-bold text-[#3B2F2F] truncate">
                      {ADMIN_EMAILS[0]}
                    </div>
                    <div className="text-[10px] font-body text-[#856404]">
                      기본 관리자 (고정 · 변경 불가)
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-pixel bg-[#FFF3BF] text-[#D9480F] border border-[#FFD43B] px-1.5 py-0.5 rounded">
                    대표
                  </span>
                </div>

                {/* Dynamically Added Admins */}
                {adminAccounts.map((acc) => (
                  <div
                    key={acc.email}
                    className="bg-[#FAF7F0] border border-[#D8CBB8] rounded px-2.5 py-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-pixel text-[11px] font-bold text-[#3B2F2F] truncate">
                        {acc.email}
                      </div>
                      {acc.note && (
                        <div className="text-[10px] font-body text-[#666666] truncate">
                          {acc.note}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await AdminService.removeAdminAccount(acc.email);
                          bgmPlayer.playChime();
                          onShowToast(`${acc.email} 관리자 권한을 삭제했습니다.`);
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : '삭제에 실패했습니다.';
                          onShowToast(msg);
                        }
                      }}
                      className="p-1 text-[#999999] hover:text-[#E03131] hover:bg-[#FFF5F5] rounded cursor-pointer shrink-0"
                      title="관리자 권한 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Admin Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAdminError(null);
                setIsSavingAdmin(true);
                try {
                  await AdminService.addAdminAccount(
                    newAdminEmail,
                    newAdminNote,
                    currentUser?.email || ADMIN_EMAILS[0]
                  );
                  setNewAdminEmail('');
                  setNewAdminNote('');
                  bgmPlayer.playChime();
                  onShowToast('새 관리자 계정이 등록되었습니다! 👑');
                } catch (err: unknown) {
                  const msg =
                    err instanceof Error && !err.message.startsWith('{')
                      ? err.message
                      : '관리자 추가에 실패했습니다. 이메일과 권한을 확인해주세요.';
                  setAdminError(msg);
                } finally {
                  setIsSavingAdmin(false);
                }
              }}
              className="space-y-2 border-t border-dashed border-[#dcd1be] pt-3"
            >
              <div className="font-pixel text-[11px] font-bold text-[#3B2F2F]">
                새 관리자 이메일 추가
              </div>

              {adminError && (
                <div className="p-2 rounded bg-[#FFF0F0] border border-[#FF8787] text-[#E03131] text-[11px] font-pixel">
                  {adminError}
                </div>
              )}

              <input
                type="email"
                required
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="추가할 구글 이메일 (예: bride@gmail.com)"
                maxLength={100}
                className="w-full text-xs font-pixel px-2.5 py-1.5 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF]"
              />
              <input
                type="text"
                value={newAdminNote}
                onChange={(e) => setNewAdminNote(e.target.value)}
                placeholder="메모 (선택, 예: 신부 / 공동 관리자)"
                maxLength={50}
                className="w-full text-xs font-body px-2.5 py-1.5 border border-[#D8CBB8] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF]"
              />

              <p className="text-[10px] font-body text-[#777777] leading-snug">
                추가된 Google 이메일로 관리자 로그인하면 동일하게 모든 관리 기능을 사용할 수 있습니다. (Firebase Firestore <code className="font-mono">admins</code> 컬렉션과 실시간 연동)
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminManageModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 text-xs font-pixel cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdmin || !newAdminEmail.trim()}
                  className="retro-btn-blue flex-2 py-2 text-xs font-pixel cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isSavingAdmin ? '등록 중...' : '관리자 추가하기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
