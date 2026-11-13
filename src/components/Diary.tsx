import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  X, 
  Save 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WeddingDataService } from '../services/weddingDataService';
import { WEDDING_CONFIG, DiaryItem } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';

interface DiaryProps {
  onShowToast: (msg: string) => void;
}

export const Diary: React.FC<DiaryProps> = ({ onShowToast }) => {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<DiaryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentMood, setCurrentMood] = useState<{ emoji: string; text: string }>({
    emoji: '🥰',
    text: '설렘과 감사',
  });
  const [reactions, setReactions] = useState<Record<string, number>>({});

  // Admin Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DiaryItem | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formStory, setFormStory] = useState('');
  const [formMood, setFormMood] = useState('두근두근 설렘');
  const [formEmoji, setFormEmoji] = useState('🥰');
  const [formWeather, setFormWeather] = useState('화창한 봄날 ☀️');
  const [isSaving, setIsSaving] = useState(false);

  const moodsList = [
    { emoji: '🥰', text: '설렘 가득' },
    { emoji: '💍', text: '평생의 약속' },
    { emoji: '🥳', text: '축제 분위기' },
    { emoji: '🌸', text: '봄날의 온기' },
    { emoji: '✨', text: '반짝반짝' },
  ];

  useEffect(() => {
    // Subscribe to Firestore diary collection
    const unsubscribe = WeddingDataService.subscribeDiary((items) => {
      setEntries(items);
      if (items.length > 0 && !expandedId) {
        setExpandedId(items[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleToggleEntry = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleReact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReactions((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    bgmPlayer.playChime();
    onShowToast('소중한 추억에 공감했어요 💕');
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    const now = new Date();
    setFormDate(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`);
    setFormTitle('');
    setFormSummary('');
    setFormStory('');
    setFormMood('두근두근 설렘');
    setFormEmoji('🥰');
    setFormWeather('화창한 날 ☀️');
    setShowModal(true);
  };

  const handleOpenEdit = (item: DiaryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormDate(item.date);
    setFormTitle(item.title);
    setFormSummary(item.shortSummary);
    setFormStory(item.fullStory);
    setFormMood(item.mood);
    setFormEmoji(item.moodEmoji);
    setFormWeather(item.weather || '맑음 ☀️');
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('이 다이어리 기록을 삭제할까요?')) return;
    try {
      await WeddingDataService.deleteDiary(id);
      bgmPlayer.playChime();
      onShowToast('다이어리 기록이 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      onShowToast('삭제에 실패했습니다.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStory.trim() || !formDate.trim()) {
      onShowToast('필수 항목을 모두 입력해주세요!');
      return;
    }

    setIsSaving(true);
    try {
      const year = formDate.slice(0, 4);
      if (editingItem) {
        await WeddingDataService.updateDiary(editingItem.id, {
          date: formDate.trim(),
          year,
          title: formTitle.trim(),
          shortSummary: formSummary.trim() || formStory.slice(0, 40) + '...',
          fullStory: formStory.trim(),
          mood: formMood.trim(),
          moodEmoji: formEmoji,
          weather: formWeather.trim(),
        });
        onShowToast('다이어리 글이 수정되었습니다! ✨');
      } else {
        await WeddingDataService.addDiary({
          date: formDate.trim(),
          year,
          title: formTitle.trim(),
          shortSummary: formSummary.trim() || formStory.slice(0, 40) + '...',
          fullStory: formStory.trim(),
          mood: formMood.trim(),
          moodEmoji: formEmoji,
          weather: formWeather.trim(),
          order: entries.length,
        });
        onShowToast('새 다이어리 글이 등록되었습니다! 📔');
      }
      setShowModal(false);
      bgmPlayer.playChime();
    } catch (err) {
      console.error(err);
      onShowToast('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Diary Header with Cyworld Mood Indicator */}
      <div className="retro-box-cream p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📔</span>
            <h2 className="font-pixel text-sm sm:text-base font-bold text-[#3B2F2F]">
              {WEDDING_CONFIG.groom.name} & {WEDDING_CONFIG.bride.name}의 비밀 일기
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[11px] text-[#2E8BFF] bg-white border border-[#3B2F2F] px-2 py-0.5 rounded shadow-[1px_1px_0_#3B2F2F]">
              총 {entries.length}개의 기록
            </span>
            {/* Admin Add Story Button */}
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="retro-btn bg-[#2E8BFF] text-white px-2 py-0.5 text-xs font-pixel flex items-center gap-1 cursor-pointer"
                title="새 이야기 추가"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>추가</span>
              </button>
            )}
          </div>
        </div>

        {/* 오늘의 기분 Widget */}
        <div className="bg-white border-2 border-[#3B2F2F] rounded p-2.5 flex items-center justify-between gap-2 shadow-[2px_2px_0_#3B2F2F]">
          <div className="flex items-center gap-2 text-xs font-pixel">
            <span className="text-base">{currentMood.emoji}</span>
            <div className="flex items-center gap-1">
              <span className="text-[#888888]">오늘의 기분:</span>
              <span className="font-bold text-[#2E8BFF]">{currentMood.text}</span>
            </div>
          </div>

          {/* Quick Mood Changers */}
          <div className="flex items-center gap-1">
            {moodsList.slice(0, 4).map((m, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentMood(m);
                  onShowToast(`기분이 '${m.text}'(으)로 변경되었습니다!`);
                }}
                className={`w-6 h-6 rounded border flex items-center justify-center text-xs hover:scale-110 transition-transform cursor-pointer ${
                  currentMood.text === m.text
                    ? 'border-[#2E8BFF] bg-[#EBF4FF]'
                    : 'border-[#dcd1be] bg-white'
                }`}
                title={m.text}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Diary Entries Timeline */}
      <div className="space-y-2.5">
        {entries.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const count = reactions[item.id] || 0;

          return (
            <div
              key={item.id}
              className="retro-box overflow-hidden bg-white transition-all shadow-[3px_3px_0_#3B2F2F]"
            >
              {/* Header Row */}
              <div
                onClick={() => handleToggleEntry(item.id)}
                className={`p-3 flex items-start gap-3 cursor-pointer select-none transition-colors ${
                  isExpanded ? 'bg-[#FAF7F0] border-b-2 border-dashed border-[#dcd1be]' : 'hover:bg-[#FFFDF9]'
                }`}
              >
                {/* Left Date Stamp */}
                <div className="flex flex-col items-center justify-center bg-[#FFF8E7] border-2 border-[#3B2F2F] rounded px-2 py-1.5 shrink-0 shadow-[1px_1px_0_#3B2F2F] min-w-[70px]">
                  <span className="font-pixel text-[10px] text-[#888888]">{item.year}</span>
                  <span className="font-pixel text-xs font-bold text-[#3B2F2F] leading-tight">
                    {item.date.slice(5)}
                  </span>
                </div>

                {/* Right Title & Short Summary */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-pixel text-xs sm:text-sm font-bold text-[#3B2F2F] truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {/* Admin edit/delete buttons */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 mr-1">
                          <button
                            onClick={(e) => handleOpenEdit(item, e)}
                            className="text-[#2E8BFF] hover:bg-[#EBF4FF] p-1 rounded"
                            title="수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="text-[#E03131] hover:bg-[#FFF0F0] p-1 rounded"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="text-[#888888]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                  <p className="font-body text-[11px] text-[#666666] line-clamp-1 leading-snug">
                    {item.shortSummary}
                  </p>
                </div>
              </div>

              {/* Expanded Story Body */}
              {isExpanded && (
                <div className="p-3.5 sm:p-4 bg-white space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] font-pixel text-[#888888] bg-[#FFFDF9] border border-[#e5dbc9] p-2 rounded">
                    <span>날씨: {item.weather || '맑음 ☀️'}</span>
                    <span>기분: {item.moodEmoji} {item.mood}</span>
                  </div>

                  <p className="font-body text-xs sm:text-[13px] text-[#3B2F2F] leading-relaxed whitespace-pre-line">
                    {item.fullStory}
                  </p>

                  <div className="bg-[#FAF7F0] border-2 border-[#3B2F2F] p-2.5 rounded-md flex items-center justify-between gap-2 shadow-[2px_2px_0_#3B2F2F]">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded bg-[#2E8BFF]/15 border border-[#2E8BFF] flex items-center justify-center text-lg shrink-0">
                        {item.moodEmoji}
                      </div>
                      <div className="text-[11px] font-pixel">
                        <div className="text-[#3B2F2F] font-bold">우리의 {idx + 1}번째 이야기</div>
                        <div className="text-[#888888]">영원히 기억하고 싶은 날</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleReact(item.id, e)}
                      className="retro-btn bg-white hover:bg-[#FFF0F4] text-[#3B2F2F] px-2.5 py-1 text-xs font-pixel flex items-center gap-1.5 cursor-pointer"
                      title="이야기에 공감하기"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#F4A6B7] fill-[#F4A6B7]" />
                      <span>공감 {count}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin Add / Edit Story Modal (Rendered ONLY for Admin) */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#2E8BFF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <h3 className="font-pixel text-xs font-bold text-[#2E8BFF]">
                {editingItem ? '다이어리 이야기 수정' : '새 다이어리 이야기 작성'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888888] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-2.5 text-xs font-pixel">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3B2F2F]">날짜 (YYYY.MM.DD)</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="2026.05.23"
                    required
                    className="w-full px-2.5 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3B2F2F]">기분 이모지</label>
                  <input
                    type="text"
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    placeholder="🥰"
                    required
                    className="w-full px-2.5 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#3B2F2F]">제목</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  required
                  className="w-full px-2.5 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#3B2F2F]">한 줄 요약</label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="목록에 표시될 짧은 요약"
                  className="w-full px-2.5 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#3B2F2F]">전체 이야기 내용</label>
                <textarea
                  value={formStory}
                  onChange={(e) => setFormStory(e.target.value)}
                  rows={5}
                  required
                  placeholder="소중했던 날의 이야기를 적어주세요."
                  className="w-full font-body text-xs p-2 border border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="retro-btn-blue flex-2 py-2 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? '저장 중...' : '저장하기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
