import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, LogIn, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';

interface AdminLoginModalProps {
  onShowToast: (msg: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onShowToast }) => {
  const { showAdminModal, setShowAdminModal, loginAsAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!showAdminModal) return null;

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginAsAdmin();
      bgmPlayer.playChime();
      onShowToast('관리자 모드로 전환되었습니다! 👑');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setErrorMessage(msg);
      onShowToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowAdminModal(false);
    setErrorMessage(null);
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="retro-box bg-white max-w-sm w-full p-4 space-y-3.5 shadow-[6px_6px_0_#2E8BFF]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2E8BFF]" />
              <h3 className="font-pixel text-sm font-bold text-[#3B2F2F]">
                관리자 로그인 (비공개)
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-[#888888] hover:text-[#3B2F2F] font-bold p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-body text-[#555555] leading-relaxed">
              신랑·신부 전용 관리자 모드입니다. 등록된 구글 계정으로 로그인하면 내용 수정, 일촌 승인, 방명록 관리가 가능합니다.
            </p>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-2.5 rounded bg-[#FFF0F0] border border-[#FF8787] flex items-start gap-2 text-[#E03131] font-pixel text-[11px] animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Google Sign-In Button */}
          <div className="pt-1">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full retro-btn-blue py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-pixel cursor-pointer hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? '인증 확인 중...' : 'Google 계정으로 관리자 로그인'}</span>
            </button>
          </div>

          <div className="text-[10px] font-pixel text-[#888888] text-center pt-1 border-t border-dashed border-[#dcd1be]">
            승인된 관리자: {ADMIN_EMAILS.join(', ')}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
