import React, { useState, useEffect } from 'react';
import { Heart, UserPlus, Sparkles, Check, Trash2, Clock, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  WeddingDataService, 
  FirestoreIlchonItem 
} from '../services/weddingDataService';
import { WEDDING_CONFIG } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';
import { AcornService } from '../services/acornService';

interface IlchonListProps {
  onShowToast: (msg: string) => void;
  onGoToGuestbook?: () => void;
}

export const IlchonList: React.FC<IlchonListProps> = ({ onShowToast }) => {
  const { isAdmin, currentUser } = useAuth();
  const [approvedList, setApprovedList] = useState<FirestoreIlchonItem[]>([]);
  const [pendingList, setPendingList] = useState<FirestoreIlchonItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'groom' | 'bride'>('all');

  // Application Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [ilchonName, setIlchonName] = useState('');
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('🤝');
  const [side, setSide] = useState<'groom' | 'bride' | 'both'>('both');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emojiOptions = ['🤝', '🎮', '🍰', '👑', '🍺', '🎸', '💼', '💐', '✨', '🥰', '🎈', '💕'];

  useEffect(() => {
    // 1. Subscribe to approved ilchons
    const unsubApproved = WeddingDataService.subscribeApprovedIlchons((items) => {
      setApprovedList(items);
    });

    // 2. Subscribe to pending ilchons for admin review
    const unsubPending = WeddingDataService.subscribePendingIlchons((items) => {
      setPendingList(items);
    });

    return () => {
      unsubApproved();
      unsubPending();
    };
  }, []);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !relationship.trim() || !ilchonName.trim() || !message.trim()) {
      onShowToast('모든 입력 항목을 작성해주세요!');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Submit ilchon request
      await WeddingDataService.requestIlchon({
        name: name.trim(),
        relationship: relationship.trim(),
        ilchonName: ilchonName.trim(),
        message: message.trim(),
        emoji,
        side,
      });

      // 2. Automatically post to Guestbook
      await WeddingDataService.addGuestbook({
        authorName: name.trim(),
        ilchonName: ilchonName.trim(),
        emoji,
        message: message.trim(),
        authorUid: currentUser?.uid || 'anon',
      });

      bgmPlayer.playChime();
      setShowApplyModal(false);
      setName('');
      setRelationship('');
      setIlchonName('');
      setMessage('');
      onShowToast('일촌 신청 완료! 방명록에도 함께 등록되었어요 💌');

      // Check and claim ilchon & guestbook rewards
      if (currentUser?.uid) {
        setTimeout(() => {
          AcornService.claimIlchonReward(currentUser.uid, onShowToast);
          AcornService.claimGuestbookReward(currentUser.uid, () => {});
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '일촌 신청에 실패했습니다.';
      onShowToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await WeddingDataService.approveIlchon(id);
      bgmPlayer.playChime();
      onShowToast('일촌 신청이 승인되었습니다! 🎉');
    } catch (e) {
      console.error(e);
      onShowToast('승인 처리에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string, isReject = false) => {
    try {
      await WeddingDataService.deleteIlchon(id);
      bgmPlayer.playChime();
      onShowToast(isReject ? '일촌 신청을 거절(삭제)했습니다.' : '일촌이 삭제되었습니다.');
    } catch (e) {
      console.error(e);
      onShowToast('삭제에 실패했습니다.');
    }
  };

  const filteredIlchons = approvedList.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'groom') return item.side === 'groom' || item.side === 'both';
    if (filter === 'bride') return item.side === 'bride' || item.side === 'both';
    return true;
  });

  return (
    <div className="w-full space-y-3.5">
      {/* Top Banner */}
      <div className="retro-box-cream p-2.5 sm:p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl shrink-0">🤝</span>
          <div className="min-w-0">
            <h2 className="font-pixel text-xs sm:text-sm font-bold text-[#3B2F2F] whitespace-nowrap">
              {WEDDING_CONFIG.groom.name} & {WEDDING_CONFIG.bride.name}의 소중한 일촌들
            </h2>
            <p className="text-[11px] font-body text-[#666666] truncate">
              우리 삶을 빛내준 따뜻한 사람들의 한마디
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="retro-btn bg-[#2E8BFF] text-white px-2.5 py-1 text-xs font-pixel flex items-center gap-1.5 shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          title="일촌 신청하기"
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span className="flex flex-col text-center text-[11px] leading-[1.15]">
            <span>일촌</span>
            <span>신청</span>
          </span>
        </button>
      </div>

      {/* Admin Review Panel for Pending Ilchons (Rendered ONLY for Admin) */}
      {isAdmin && (
        <div className="retro-box bg-[#FFF8E7] p-3 space-y-2.5 border-2 border-[#D9480F] shadow-[3px_3px_0_#D9480F] animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#3B2F2F] pb-1.5 text-xs font-pixel">
            <div className="flex items-center gap-1.5 text-[#D9480F] font-bold">
              <Clock className="w-4 h-4 text-[#D9480F]" />
              <span>대기중 신청 관리 ({pendingList.length}건)</span>
            </div>
            <span className="text-[10px] text-[#666666]">승인 시 손님 화면에 노출됩니다</span>
          </div>

          {pendingList.length === 0 ? (
            <div className="text-center py-2 text-[11px] font-pixel text-[#888888]">
              현재 대기 중인 일촌 신청이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-2.5 rounded border border-[#3B2F2F] text-xs space-y-1.5 shadow-[1px_1px_0_#3B2F2F]"
                >
                  <div className="flex items-center justify-between font-pixel">
                    <div className="flex items-center gap-1.5">
                      <span>{item.emoji}</span>
                      <span className="font-bold">{item.name}</span>
                      <span className="text-[10px] text-[#666666]">({item.relationship})</span>
                      <span className="text-[#2E8BFF] text-[11px]">&lsquo;{item.ilchonName}&rsquo;</span>
                    </div>
                    <span className="text-[10px] font-pixel bg-[#FFF3BF] text-[#D9480F] px-1.5 rounded">
                      대기중
                    </span>
                  </div>

                  <p className="font-body text-[11px] text-[#444444] bg-[#FAF7F0] p-1.5 rounded">
                    &ldquo;{item.message}&rdquo;
                  </p>

                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    <button
                      onClick={() => handleDelete(item.id, true)}
                      className="retro-btn bg-white hover:bg-[#FFF0F4] text-[#E03131] px-2 py-0.5 text-[10px] font-pixel flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>거절(삭제)</span>
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="retro-btn bg-[#2E8BFF] text-white px-2.5 py-0.5 text-[10px] font-pixel flex items-center gap-0.5 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>승인하기</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Groom ↔ Bride Relationship Banner */}
      <div className="retro-box p-4 bg-white space-y-3 text-center shadow-[3px_3px_0_#3B2F2F]">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F4] border border-[#F4A6B7] text-[#3B2F2F] font-pixel text-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#F4A6B7]" />
          <span>신랑 ♥ 신부 일촌 맺기 완료</span>
        </div>

        {/* Connected Visual Line */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {/* Groom Avatar */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-[#EBF4FF] border-2 border-[#3B2F2F] flex items-center justify-center text-2xl shadow-[2px_2px_0_#3B2F2F]">
              🤵
            </div>
            <span className="font-pixel text-xs font-bold text-[#3B2F2F]">{WEDDING_CONFIG.groom.name}</span>
            <span className="text-[10px] font-pixel text-[#2E8BFF]">영원한 신랑</span>
          </div>

          {/* Glowing Heart Connection */}
          <div className="flex flex-col items-center px-2">
            <div className="flex items-center gap-1 text-[#F4A6B7]">
              <span className="h-0.5 w-6 bg-[#3B2F2F]" />
              <Heart className="w-5 h-5 fill-[#F4A6B7] text-[#3B2F2F] animate-bounce" />
              <span className="h-0.5 w-6 bg-[#3B2F2F]" />
            </div>
            <span className="text-[10px] font-pixel text-[#888888] mt-1">
              {WEDDING_CONFIG.miniroom.relationStartDate.replace(/-/g, '.')} ~ 영원히
            </span>
          </div>

          {/* Bride Avatar */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-[#FFF0F4] border-2 border-[#3B2F2F] flex items-center justify-center text-2xl shadow-[2px_2px_0_#3B2F2F]">
              👰
            </div>
            <span className="font-pixel text-xs font-bold text-[#3B2F2F]">{WEDDING_CONFIG.bride.name}</span>
            <span className="text-[10px] font-pixel text-[#F4A6B7]">눈부신 신부</span>
          </div>
        </div>

        <p className="font-body text-xs text-[#555555] pt-1">
          “서로의 가장 친한 친구이자, 평생 함께할 동반자가 되었습니다.”
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-1.5 font-pixel text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`retro-btn py-1.5 transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#2E8BFF] text-white shadow-[2px_2px_0_#3B2F2F]'
              : 'bg-white hover:bg-[#FAF7F0] text-[#3B2F2F]'
          }`}
        >
          전체 일촌 ({approvedList.length})
        </button>
        <button
          onClick={() => setFilter('groom')}
          className={`retro-btn py-1.5 transition-all cursor-pointer ${
            filter === 'groom'
              ? 'bg-[#2E8BFF] text-white shadow-[2px_2px_0_#3B2F2F]'
              : 'bg-white hover:bg-[#FAF7F0] text-[#3B2F2F]'
          }`}
        >
          신랑측 일촌
        </button>
        <button
          onClick={() => setFilter('bride')}
          className={`retro-btn py-1.5 transition-all cursor-pointer ${
            filter === 'bride'
              ? 'bg-[#2E8BFF] text-white shadow-[2px_2px_0_#3B2F2F]'
              : 'bg-white hover:bg-[#FAF7F0] text-[#3B2F2F]'
          }`}
        >
          신부측 일촌
        </button>
      </div>

      {/* Approved Ilchon Cards List */}
      <div className="space-y-2.5">
        {filteredIlchons.map((ilchon) => (
          <div
            key={ilchon.id}
            className="retro-box p-3 bg-white space-y-2 shadow-[3px_3px_0_#3B2F2F] hover:shadow-[4px_4px_0_#2E8BFF] transition-all"
          >
            {/* Header: Avatar, Name, Relationship and Ilchon Name */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-[#FFF8E7] border-2 border-[#3B2F2F] flex items-center justify-center text-xl shrink-0 shadow-[1px_1px_0_#3B2F2F]">
                {ilchon.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-pixel text-xs sm:text-sm font-bold text-[#3B2F2F]">
                      {ilchon.name}
                    </span>
                    <span className="text-[10px] font-pixel text-[#666666] bg-[#FAF7F0] px-1.5 py-0.2 rounded border border-[#dcd1be]">
                      {ilchon.relationship}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-pixel text-[#2E8BFF] bg-[#EBF4FF] px-1.5 py-0.5 rounded border border-[#2E8BFF]/30">
                      일촌
                    </span>
                    {/* Admin Delete Action */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(ilchon.id)}
                        className="text-[10px] text-[#E03131] hover:underline px-1 cursor-pointer"
                        title="관리자 삭제"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-pixel text-[#2E8BFF] mt-0.5 truncate">
                  일촌명: &lsquo;{ilchon.ilchonName}&rsquo;
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA to Apply as Ilchon */}
      <div className="retro-box-cream p-4 text-center space-y-2.5 shadow-[3px_3px_0_#3B2F2F]">
        <div className="font-pixel text-xs sm:text-sm font-bold text-[#3B2F2F]">
          나도 신랑·신부와 일촌 맺기!
        </div>
        <p className="font-body text-xs text-[#666666]">
          일촌 신청을 남겨주시면 신랑·신부 확인 후 목록에 등록됩니다.
        </p>
        <button
          onClick={() => setShowApplyModal(true)}
          className="w-full retro-btn-blue py-2.5 text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>일촌 신청하기</span>
        </button>
      </div>

      {/* 일촌 신청하기 Modal Popup */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#2E8BFF]">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#2E8BFF]" />
                <h3 className="font-pixel text-sm font-bold text-[#3B2F2F]">
                  일촌 신청하기 💌
                </h3>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-[#888888] hover:text-[#3B2F2F] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#EBF4FF] p-2 rounded border border-[#2E8BFF] text-[11px] font-pixel text-[#1C74E0]">
              💡 일촌 신청 시 작성하신 축하 한마디는 방명록에 자동으로 함께 등록됩니다 💌
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block font-pixel text-[#3B2F2F] text-[11px]">
                    이름 <span className="text-[#E03131]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 김민석"
                    maxLength={15}
                    required
                    className="w-full font-pixel px-2.5 py-1.5 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-pixel text-[#3B2F2F] text-[11px]">
                    관계 <span className="text-[#E03131]">*</span>
                  </label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="예: 신랑 고교동창"
                    maxLength={15}
                    required
                    className="w-full font-pixel px-2.5 py-1.5 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-pixel text-[#3B2F2F] text-[11px]">
                  원하는 일촌명 <span className="text-[#E03131]">*</span>
                </label>
                <input
                  type="text"
                  value={ilchonName}
                  onChange={(e) => setIlchonName(e.target.value)}
                  placeholder="예: 영원한 롤 듀오"
                  maxLength={15}
                  required
                  className="w-full font-pixel px-2.5 py-1.5 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF]"
                />
              </div>

              {/* Side Selector */}
              <div className="space-y-1">
                <label className="block font-pixel text-[#3B2F2F] text-[11px]">
                  구분
                </label>
                <div className="grid grid-cols-3 gap-1 font-pixel text-center">
                  {(['both', 'groom', 'bride'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={`py-1 rounded border cursor-pointer ${
                        side === s ? 'bg-[#2E8BFF] text-white border-[#3B2F2F]' : 'bg-white border-[#dcd1be]'
                      }`}
                    >
                      {s === 'both' ? '둘 다' : s === 'groom' ? '신랑측' : '신부측'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Selector */}
              <div className="space-y-1">
                <label className="block font-pixel text-[#3B2F2F] text-[11px]">
                  대표 이모지
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {emojiOptions.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-sm ${
                        emoji === em ? 'bg-[#2E8BFF] text-white' : 'bg-white border border-[#dcd1be]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <div className="flex items-center justify-between font-pixel text-[11px]">
                  <span>축하 한마디</span>
                  <span className="text-[#888888]">{message.length}/200</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  placeholder="신랑·신부에게 전할 축하의 마음을 적어주세요."
                  rows={3}
                  required
                  className="w-full font-body text-xs p-2 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none resize-none"
                />
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 font-pixel"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="retro-btn-blue flex-2 py-2 font-pixel cursor-pointer"
                >
                  {isSubmitting ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
