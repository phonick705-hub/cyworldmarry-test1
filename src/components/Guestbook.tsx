import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageCircle, 
  Heart, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  WeddingDataService, 
  FirestoreGuestbookItem 
} from '../services/weddingDataService';
import { WEDDING_CONFIG } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';
import { AcornService } from '../services/acornService';

interface GuestbookProps {
  onShowToast: (msg: string) => void;
  onEntryAdded?: () => void;
  onGoToIlchon?: () => void;
}

export const Guestbook: React.FC<GuestbookProps> = ({ onShowToast, onEntryAdded, onGoToIlchon }) => {
  const { currentUser, isAdmin } = useAuth();
  const [entries, setEntries] = useState<FirestoreGuestbookItem[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [ilchonName, setIlchonName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💕');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedEntries, setLikedEntries] = useState<Record<string, number>>({});

  // Prompt modal and write form toggle states
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAuthorName, setEditAuthorName] = useState('');
  const [editIlchonName, setEditIlchonName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // Delete confirmation modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const emojiList = [
    '💕', '😊', '🥰', '😆', '🎉', '💐', '🍀', '🌸',
    '✨', '💌', '🥂', '🎈', '💍', '🥳', '🕊️', '💖'
  ];

  useEffect(() => {
    // Real-time Firestore sync
    const unsubscribe = WeddingDataService.subscribeGuestbook((data) => {
      setEntries(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      onShowToast('축하 메시지를 입력해주세요! ✍️');
      return;
    }

    setIsSubmitting(true);
    bgmPlayer.playChime();

    try {
      await WeddingDataService.addGuestbook({
        authorName: authorName.trim() || '익명의 일촌',
        ilchonName: ilchonName.trim(),
        emoji: selectedEmoji,
        message: message.trim(),
        authorUid: currentUser?.uid || 'anon',
      });

      setMessage('');
      setAuthorName('');
      setIlchonName('');
      setShowWriteForm(false);
      onShowToast('소중한 마음이 방명록에 등록되었습니다! 💌');
      if (onEntryAdded) {
        onEntryAdded();
      }

      // Check and claim first guestbook acorn reward (+10 acorns)
      if (currentUser?.uid) {
        setTimeout(() => {
          AcornService.claimGuestbookReward(currentUser.uid, onShowToast);
        }, 1200);
      }
    } catch (err: unknown) {
      console.error(err);
      onShowToast('방명록 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (entry: FirestoreGuestbookItem) => {
    setEditingId(entry.id);
    setEditAuthorName(entry.authorName || entry.author.split('(')[0] || '');
    setEditIlchonName(entry.ilchonName || (entry.author.includes('(') ? entry.author.split('(')[1].replace(')', '') : ''));
    setEditEmoji(entry.emoji || '💕');
    setEditMessage(entry.message || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editMessage.trim()) {
      onShowToast('메시지 내용을 입력해주세요!');
      return;
    }

    try {
      await WeddingDataService.updateGuestbook(id, {
        authorName: editAuthorName.trim() || '익명의 일촌',
        ilchonName: editIlchonName.trim(),
        emoji: editEmoji,
        message: editMessage.trim(),
      });
      setEditingId(null);
      bgmPlayer.playChime();
      onShowToast('방명록 글이 수정되었습니다! ✨');
    } catch (e) {
      console.error(e);
      onShowToast('글 수정에 실패했습니다.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await WeddingDataService.deleteGuestbook(deleteTargetId);
      setDeleteTargetId(null);
      bgmPlayer.playChime();
      onShowToast('방명록 글이 삭제되었습니다.');
    } catch (e) {
      console.error(e);
      onShowToast('글 삭제에 실패했습니다.');
    }
  };

  const handleLike = (id: string) => {
    setLikedEntries((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    bgmPlayer.playChime();
    onShowToast('방명록에 하트를 보냈어요 💕');
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Top Cyworld Guestbook Banner */}
      <div className="retro-box-cream p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💌</span>
          <div>
            <h2 className="font-pixel text-sm sm:text-base font-bold text-[#3B2F2F]">
              {WEDDING_CONFIG.groom.name} & {WEDDING_CONFIG.bride.name}의 방명록
            </h2>
            <p className="text-[11px] font-body text-[#666666]">
              두 사람의 새로운 출발을 응원해주세요
            </p>
          </div>
        </div>
        <div className="text-[11px] font-pixel text-[#2E8BFF] bg-white border border-[#3B2F2F] px-2 py-0.5 rounded shadow-[1px_1px_0_#3B2F2F]">
          마음을 남긴 사람 {entries.length}명
        </div>
      </div>

      {/* Guestbook Submission Section: Button or Form */}
      {!showWriteForm ? (
        <div className="retro-box p-3.5 sm:p-4 bg-white flex items-center justify-between gap-3 shadow-[3px_3px_0_#3B2F2F]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✍️</span>
            <div>
              <h3 className="font-pixel text-xs sm:text-sm font-bold text-[#3B2F2F]">
                축하의 한마디 전하기
              </h3>
              <p className="text-[11px] font-body text-[#666666]">
                두 사람의 앞날을 축복하는 마음을 남겨주세요
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPromptModal(true)}
            className="retro-btn-blue px-3 py-2 text-xs font-pixel shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>방명록 남기기</span>
          </button>
        </div>
      ) : (
        <div className="retro-box p-3.5 sm:p-4 bg-white space-y-3 animate-fadeIn shadow-[3px_3px_0_#3B2F2F]">
          <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-[#2E8BFF]" />
              <h3 className="font-pixel text-xs sm:text-sm font-bold text-[#3B2F2F]">
                축하의 한마디 남기기
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowWriteForm(false)}
              className="text-xs font-pixel text-[#888888] hover:text-[#3B2F2F] cursor-pointer"
            >
              접기 ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Separate Author Name & Ilchon Name Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-pixel text-[#3B2F2F]">
                  작성자 이름 <span className="text-[#E03131]">*</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="예: 김민석"
                  maxLength={15}
                  className="w-full text-xs font-pixel px-2.5 py-2 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF] transition-colors shadow-[1px_1px_0_#3B2F2F]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-pixel text-[#3B2F2F]">
                  일촌명 <span className="text-[#888888] font-normal text-[10px]">(선택)</span>
                </label>
                <input
                  type="text"
                  value={ilchonName}
                  onChange={(e) => setIlchonName(e.target.value)}
                  placeholder="예: 영원한 친구"
                  maxLength={15}
                  className="w-full text-xs font-pixel px-2.5 py-2 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF] transition-colors shadow-[1px_1px_0_#3B2F2F]"
                />
              </div>
            </div>

            {/* Display Preview Indicator */}
            <div className="bg-[#FAF7F0] border border-[#dcd1be] rounded px-2.5 py-1 text-[11px] font-pixel text-[#555555] flex items-center justify-between">
              <span className="text-[#888888]">표시 이름:</span>
              <span className="font-bold text-[#2E8BFF]">
                {authorName.trim()
                  ? ilchonName.trim()
                    ? `${authorName.trim()}(${ilchonName.trim()})`
                    : authorName.trim()
                  : '이름(일촌명)'}
              </span>
            </div>

            {/* Emoji Avatar Selector Grid */}
            <div className="space-y-1">
              <label className="block text-[11px] font-pixel text-[#3B2F2F] flex items-center justify-between">
                <span>이모지 아바타 선택</span>
                <span className="text-[#2E8BFF] text-[10px]">선택됨: {selectedEmoji}</span>
              </label>
              <div className="grid grid-cols-8 gap-1 p-1.5 bg-[#FAF7F0] border-2 border-[#3B2F2F] rounded shadow-[1px_1px_0_#3B2F2F]">
                {emojiList.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`h-8 rounded flex items-center justify-center text-sm transition-all cursor-pointer ${
                      selectedEmoji === emoji
                        ? 'bg-[#2E8BFF] text-white scale-110 shadow-xs ring-1 ring-[#3B2F2F]'
                        : 'hover:bg-white bg-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-pixel text-[#3B2F2F]">
                <span>축하 메시지 (최대 200자)</span>
                <span className={message.length >= 190 ? 'text-[#E03131]' : 'text-[#888888]'}>
                  {message.length} / 200
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="결혼을 축하하는 따뜻한 축복의 글을 남겨주세요 💕"
                rows={3}
                className="w-full text-xs font-body p-2.5 border-2 border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none focus:border-[#2E8BFF] resize-none transition-colors shadow-[1px_1px_0_#3B2F2F] leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full retro-btn-blue py-2.5 text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '저장 중...' : '방명록 남기기'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Confirmation Prompt Modal: "일촌 신청 없이 방명록만 남기시겠습니까?" */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3.5 text-center shadow-[6px_6px_0_#2E8BFF]">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#EBF4FF] border-2 border-[#2E8BFF] flex items-center justify-center text-2xl">
              💌
            </div>

            <div className="space-y-1.5">
              <h4 className="font-pixel text-sm sm:text-base font-bold text-[#3B2F2F] leading-snug">
                일촌 신청 없이 방명록만 남기시겠습니까?
              </h4>
              <p className="font-body text-xs text-[#666666] leading-relaxed">
                일촌을 신청하시면 일촌 목록에도 이름이 오르고,<br />
                작성하신 축하 한마디가 방명록에도 함께 등록돼요!
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPromptModal(false);
                  if (onGoToIlchon) {
                    onGoToIlchon();
                  }
                }}
                className="retro-btn-blue py-2.5 text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🤝 일촌 신청하러 가기 (추천)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPromptModal(false);
                  setShowWriteForm(true);
                }}
                className="retro-btn bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#3B2F2F] py-2.5 text-xs font-pixel flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>📝 방명록만 남길래요</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPromptModal(false)}
              className="text-[11px] font-pixel text-[#888888] hover:underline pt-1 cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Guestbook Entries List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs font-pixel text-[#3B2F2F]">
          <span className="font-bold">최신 방명록 목록</span>
          <span className="text-[#888888]">총 {entries.length}개</span>
        </div>

        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {entries.map((entry, index) => {
              const likeCount = likedEntries[entry.id] || 0;
              const isAuthor = currentUser?.uid && entry.authorUid === currentUser.uid;
              const canDelete = isAuthor || isAdmin;
              const isEditingThis = editingId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: -15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="retro-box p-3 bg-white space-y-2 shadow-[3px_3px_0_#3B2F2F]"
                >
                  {isEditingThis ? (
                    /* Inline Editing Mode */
                    <div className="space-y-2.5 bg-[#FFFDF9] p-2 rounded border border-[#2E8BFF] animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-pixel text-[#2E8BFF] pb-1 border-b border-dashed border-[#2E8BFF]">
                        <span className="flex items-center gap-1 font-bold">
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>글 수정하기</span>
                        </span>
                        <span className="text-[10px] text-[#666666]">
                          {editMessage.length} / 200자
                        </span>
                      </div>

                      {/* Name / Ilchon inputs */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs font-pixel">
                        <input
                          type="text"
                          value={editAuthorName}
                          onChange={(e) => setEditAuthorName(e.target.value)}
                          placeholder="이름"
                          maxLength={15}
                          className="px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs outline-none"
                        />
                        <input
                          type="text"
                          value={editIlchonName}
                          onChange={(e) => setEditIlchonName(e.target.value)}
                          placeholder="일촌명"
                          maxLength={15}
                          className="px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs outline-none"
                        />
                      </div>

                      {/* Emoji Picker row */}
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {emojiList.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setEditEmoji(e)}
                            className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-xs ${
                              editEmoji === e ? 'bg-[#2E8BFF] text-white' : 'bg-white border border-[#dcd1be]'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value.slice(0, 200))}
                        rows={3}
                        className="w-full text-xs font-body p-2 border border-[#3B2F2F] rounded bg-white outline-none resize-none leading-relaxed"
                      />

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] px-2.5 py-1 text-xs font-pixel flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>취소</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(entry.id)}
                          className="retro-btn bg-[#2E8BFF] text-white px-3 py-1 text-xs font-pixel flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>저장</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <>
                      {/* Top Header of Guestbook Card */}
                      <div className="flex items-start gap-2.5">
                        {/* Left Avatar Emoji Box */}
                        <div className="w-10 h-10 rounded-md bg-[#FFF8E7] border-2 border-[#3B2F2F] flex items-center justify-center text-xl shrink-0 shadow-[1px_1px_0_#3B2F2F]">
                          {entry.emoji}
                        </div>

                        {/* Right Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-pixel text-xs font-bold text-[#3B2F2F]">
                                {entry.author}
                              </span>
                              {isAuthor && (
                                <span className="text-[9px] font-pixel bg-[#EBF4FF] text-[#2E8BFF] border border-[#2E8BFF] px-1 rounded">
                                  내 글
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-pixel text-[#888888] shrink-0">
                              No. {entries.length - index}
                            </span>
                          </div>

                          <div className="text-[10px] font-pixel text-[#999999] flex items-center gap-1 mt-0.5">
                            <span>{entry.createdAt}</span>
                            {entry.edited && (
                              <span className="text-[#2E8BFF]">(수정됨)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="pl-1 text-xs sm:text-[13px] font-body text-[#3B2F2F] leading-relaxed whitespace-pre-line bg-[#FAF7F0] p-2.5 rounded border border-[#dcd1be]/80">
                        {entry.message}
                      </div>

                      {/* Bottom Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {/* Edit / Delete buttons rendered ONLY if isAuthor or isAdmin */}
                        <div className="flex items-center gap-1.5">
                          {isAuthor && (
                            <button
                              onClick={() => startEdit(entry)}
                              className="text-[11px] font-pixel text-[#2E8BFF] hover:underline flex items-center gap-0.5 px-1 py-0.5 cursor-pointer"
                              title="글 수정"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>수정</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTargetId(entry.id)}
                              className="text-[11px] font-pixel text-[#E03131] hover:underline flex items-center gap-0.5 px-1 py-0.5 cursor-pointer"
                              title={isAdmin && !isAuthor ? '관리자 권한으로 삭제' : '글 삭제'}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>삭제</span>
                              {isAdmin && !isAuthor && <span className="text-[9px] font-pixel">(관리자)</span>}
                            </button>
                          )}
                        </div>

                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(entry.id)}
                          className="text-[11px] font-pixel text-[#666666] hover:text-[#F4A6B7] flex items-center gap-1 px-2 py-0.5 rounded border border-transparent hover:border-[#F4A6B7] transition-all cursor-pointer"
                        >
                          <Heart className={`w-3 h-3 ${likeCount > 0 ? 'text-[#F4A6B7] fill-[#F4A6B7]' : ''}`} />
                          <span>좋아요 {likeCount > 0 ? likeCount : ''}</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Device guidance note */}
        <div className="text-center pt-2 pb-1 text-[10px] font-pixel text-[#888888] flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3 text-[#2E8BFF]" />
          <span>작성한 글은 같은 기기·브라우저에서만 수정/삭제할 수 있어요</span>
        </div>
      </div>

      {/* Pixel Style Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="retro-box bg-white max-w-xs w-full p-4 space-y-3 shadow-[5px_5px_0_#E03131]">
            <div className="flex items-center gap-2 text-[#E03131] border-b border-[#3B2F2F] pb-1.5">
              <Trash2 className="w-4 h-4" />
              <h4 className="font-pixel text-xs font-bold">방명록 글 삭제</h4>
            </div>

            <p className="font-body text-xs text-[#3B2F2F] leading-relaxed">
              정말 삭제할까요? 삭제한 글은 되돌릴 수 없어요.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] px-3 py-1.5 text-xs font-pixel cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="retro-btn bg-[#E03131] text-white px-3 py-1.5 text-xs font-pixel cursor-pointer hover:brightness-110"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
