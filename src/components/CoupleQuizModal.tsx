import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  AlertTriangle,
  HelpCircle,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QuizQuestion, ACORN_CONFIG } from '../config/weddingConfig';
import { WeddingDataService } from '../services/weddingDataService';
import { AcornService, UserAcornProfile } from '../services/acornService';

interface CoupleQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

interface ShuffledQuestion {
  question: QuizQuestion;
  shuffledOptions: string[];
  correctShuffledIndex: number;
}

export const CoupleQuizModal: React.FC<CoupleQuizModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { isAdmin, currentUser } = useAuth();
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [userProfile, setUserProfile] = useState<UserAcornProfile>({
    acorns: 0,
    claimed: {},
  });

  // Game Play State
  const [roundQuestions, setRoundQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [earnedInRound, setEarnedInRound] = useState<number>(0);
  const [isRoundFinished, setIsRoundFinished] = useState<boolean>(false);
  const [shakeIncorrect, setShakeIncorrect] = useState<boolean>(false);
  const [lastQuestionIds, setLastQuestionIds] = useState<string[]>([]);
  const [currentRewardStatus, setCurrentRewardStatus] = useState<string | null>(null);

  // Admin Question Editor State
  const [showAdminEditor, setShowAdminEditor] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formAnswerIndex, setFormAnswerIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [showQuestionFormModal, setShowQuestionFormModal] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<QuizQuestion | null>(null);

  // Subscribe to questions from Firestore
  useEffect(() => {
    const unsubscribe = WeddingDataService.subscribeQuizQuestions((items) => {
      setAllQuestions(items);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to current user's acorn profile
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = AcornService.subscribeUserAcorns(currentUser.uid, (data) => {
      setUserProfile(data);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Helper to shuffle questions and options
  const startNewRound = () => {
    if (allQuestions.length === 0) {
      setRoundQuestions([]);
      return;
    }

    const roundCount = Math.min(ACORN_CONFIG.QUIZ_QUESTIONS_PER_ROUND, allQuestions.length);
    const answeredIds = userProfile.answeredQuestionIds || [];

    // Prioritize unrewarded questions
    const unrewarded = allQuestions.filter((q) => !answeredIds.includes(q.id));
    const rewarded = allQuestions.filter((q) => answeredIds.includes(q.id));

    // Also prioritize questions not used in the immediately preceding round
    const sortPool = (list: QuizQuestion[]) => {
      return [...list].sort((a, b) => {
        const aUsed = lastQuestionIds.includes(a.id);
        const bUsed = lastQuestionIds.includes(b.id);
        if (aUsed && !bUsed) return 1;
        if (!aUsed && bUsed) return -1;
        return Math.random() - 0.5;
      });
    };

    const prioritizedPool = [...sortPool(unrewarded), ...sortPool(rewarded)];
    const chosenQuestions = prioritizedPool.slice(0, roundCount);

    // Shuffle options for each chosen question without mutating original DB question
    const prepared: ShuffledQuestion[] = chosenQuestions.map((q) => {
      const optionsWithMeta = q.options.map((opt, originalIdx) => ({
        text: opt,
        isCorrect: originalIdx === q.answerIndex,
      }));

      // Shuffle options array
      const shuffled = [...optionsWithMeta].sort(() => Math.random() - 0.5);
      const correctShuffledIndex = shuffled.findIndex((item) => item.isCorrect);

      return {
        question: q,
        shuffledOptions: shuffled.map((item) => item.text),
        correctShuffledIndex,
      };
    });

    setLastQuestionIds(chosenQuestions.map((q) => q.id));
    setRoundQuestions(prepared);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setEarnedInRound(0);
    setIsRoundFinished(false);
    setCurrentRewardStatus(null);
  };

  // Start a new round whenever modal opens or questions become available
  useEffect(() => {
    if (isOpen && allQuestions.length > 0 && roundQuestions.length === 0) {
      startNewRound();
    }
  }, [isOpen, allQuestions.length]);

  if (!isOpen) return null;

  const currentQ = roundQuestions[currentIndex];

  const handleSelectOption = async (optionIndex: number) => {
    if (isAnswered || !currentQ) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQ.correctShuffledIndex;

    if (isCorrect) {
      setScore((prev) => prev + 1);

      // Attempt to reward acorns
      if (currentUser?.uid) {
        const rewardResult = await AcornService.recordQuizCorrectAnswer(
          currentUser.uid,
          currentQ.question.id
        );

        if (rewardResult.rewarded) {
          setEarnedInRound((prev) => prev + rewardResult.earnedDelta);
          setCurrentRewardStatus('rewarded');
        } else if (rewardResult.reason === 'already_answered') {
          setCurrentRewardStatus('already_answered');
        } else if (rewardResult.reason === 'daily_limit') {
          setCurrentRewardStatus('daily_limit');
        }
      }
    } else {
      setShakeIncorrect(true);
      setTimeout(() => setShakeIncorrect(false), 500);
      setCurrentRewardStatus(null);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < roundQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setCurrentRewardStatus(null);
    } else {
      setIsRoundFinished(true);
    }
  };

  // Admin Question Form Handlers
  const openAddQuestion = () => {
    setEditingQuestion(null);
    setFormQuestion('');
    setFormOptions(['', '', '', '']);
    setFormAnswerIndex(0);
    setFormExplanation('');
    setShowQuestionFormModal(true);
  };

  const openEditQuestion = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setFormQuestion(q.question);
    setFormOptions([...q.options]);
    setFormAnswerIndex(q.answerIndex);
    setFormExplanation(q.explanation);
    setShowQuestionFormModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      onShowToast('질문 내용을 입력해주세요.');
      return;
    }
    if (formOptions.some((opt) => !opt.trim())) {
      onShowToast('보기 4개를 모두 빠짐없이 입력해주세요.');
      return;
    }
    if (!formExplanation.trim()) {
      onShowToast('정답 설명을 입력해주세요.');
      return;
    }

    try {
      if (editingQuestion) {
        await WeddingDataService.updateQuizQuestion(editingQuestion.id, {
          question: formQuestion.trim(),
          options: formOptions.map((o) => o.trim()),
          answerIndex: formAnswerIndex,
          explanation: formExplanation.trim(),
        });
        onShowToast('질문이 수정되었습니다! ✏️');
      } else {
        await WeddingDataService.addQuizQuestion({
          question: formQuestion.trim(),
          options: formOptions.map((o) => o.trim()),
          answerIndex: formAnswerIndex,
          explanation: formExplanation.trim(),
          order: allQuestions.length + 1,
        });
        onShowToast('새 질문이 추가되었습니다! 💡');
      }
      setShowQuestionFormModal(false);
    } catch {
      onShowToast('질문 저장에 실패했습니다.');
    }
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    try {
      await WeddingDataService.deleteQuizQuestion(deletingQuestion.id);
      onShowToast('질문이 삭제되었습니다. 🗑️');
      setDeletingQuestion(null);
    } catch {
      onShowToast('질문 삭제에 실패했습니다.');
    }
  };

  // Result messages per user specifications
  const getResultMessage = (sc: number) => {
    if (sc === 4) return '우리 둘의 찐친이시네요 🥰';
    if (sc === 3) return '꽤 잘 아시네요 😊';
    return '다음엔 더 알아가봐요 🌱';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#e8decb] flex flex-col items-center justify-start overflow-y-auto">
      {/* Container aligned with main mobile frame */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5EFE4] bg-grid-paper border-0 sm:border-4 border-[#3B2F2F] flex flex-col relative shadow-[8px_8px_0_#3B2F2F]">
        
        {/* Top Header Bar */}
        <div className="p-3 border-b-3 border-[#3B2F2F] bg-white flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={onClose}
            className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] px-2.5 py-1 text-xs font-pixel flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>돌아가기</span>
          </button>

          <div className="flex items-center gap-1.5 font-pixel text-sm font-bold text-[#3B2F2F]">
            <span>💍</span>
            <span>커플 퀴즈</span>
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => setShowAdminEditor(true)}
                className="retro-btn bg-[#FFF3BF] hover:bg-[#FFE066] text-[#D9480F] px-2 py-1 text-[11px] font-pixel flex items-center gap-0.5 cursor-pointer border border-[#D9480F]"
                title="퀴즈 질문 관리"
              >
                <Edit className="w-3 h-3" />
                <span>질문 편집</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
          
          {/* Case 1: Empty Question Pool */}
          {allQuestions.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="text-5xl">🌿</div>
              <div className="space-y-1">
                <h3 className="font-pixel text-base font-bold text-[#3B2F2F]">
                  준비된 퀴즈가 없어요 🌿
                </h3>
                <p className="font-body text-xs text-[#666666]">
                  신랑·신부의 특별한 퀴즈 질문이 곧 등록될 예정입니다!
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={openAddQuestion}
                  className="retro-btn bg-[#2E8BFF] text-white px-4 py-2 text-xs font-pixel inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>질문 등록하기</span>
                </button>
              )}
            </div>
          ) : isRoundFinished ? (
            /* Case 2: Result Screen */
            <div className="retro-box bg-white p-6 text-center space-y-5 my-auto animate-fadeIn shadow-[5px_5px_0_#3B2F2F]">
              <div className="text-5xl">
                {score === roundQuestions.length ? '🎉' : score >= 2 ? '🥰' : '🌱'}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-pixel text-[#888888]">퀴즈 결과</span>
                <h3 className="font-pixel text-2xl font-bold text-[#3B2F2F]">
                  {score} / {roundQuestions.length} 문제 정답!
                </h3>
                <p className="font-pixel text-sm text-[#2E8BFF] font-bold pt-1">
                  {getResultMessage(score)}
                </p>
              </div>

              {/* Earned acorns during this round */}
              <div className="bg-[#FAF7F0] border-2 border-[#3B2F2F] rounded-lg p-3 space-y-1 text-xs font-pixel shadow-[2px_2px_0_#3B2F2F]">
                <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#D9480F]">
                  <span>이번 판에 적립된 도토리:</span>
                  <span className="text-base">+{earnedInRound} 🌰</span>
                </div>
                {earnedInRound === 0 && (
                  <p className="text-[11px] text-[#888888] font-body">
                    (이미 적립받은 문제이거나 하루 최대 한도 20🌰에 도달했어요)
                  </p>
                )}
                {/* Strict User Constraint: Do NOT show total balance, guide to store */}
                <p className="text-[11px] text-[#2E8BFF] font-body pt-1">
                  ※ 도토리 총 잔액은 스토어에서 확인해보세요 🌰
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={startNewRound}
                  className="retro-btn-blue py-3 text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>다시 하기</span>
                </button>
                <button
                  onClick={onClose}
                  className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2.5 text-xs font-pixel cursor-pointer"
                >
                  스토어로 돌아가기
                </button>
              </div>
            </div>
          ) : currentQ ? (
            /* Case 3: Quiz In Progress */
            <div className="space-y-4 my-auto">
              
              {/* Progress & Current Score Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-pixel text-[#3B2F2F]">
                  <span className="font-bold">
                    질문 {currentIndex + 1} / {roundQuestions.length}
                  </span>
                  <div className="flex items-center gap-1 text-[#2E8BFF] font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>현재 점수: {score}점</span>
                  </div>
                </div>

                {/* Pixel Styled Progress Bar */}
                <div className="w-full h-3 bg-white border-2 border-[#3B2F2F] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-[#2E8BFF] rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentIndex + 1) / roundQuestions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="retro-box bg-white p-4 space-y-3 shadow-[4px_4px_0_#3B2F2F]">
                <div className="flex items-start gap-2">
                  <span className="font-pixel text-[#2E8BFF] font-bold text-base shrink-0">
                    Q{currentIndex + 1}.
                  </span>
                  <h3 className="font-pixel text-sm sm:text-base font-bold text-[#3B2F2F] leading-snug">
                    {currentQ.question.question}
                  </h3>
                </div>

                {/* 4 Options Grid */}
                <div className={`space-y-2 pt-1 ${shakeIncorrect ? 'animate-shake' : ''}`}>
                  {currentQ.shuffledOptions.map((optText, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQ.correctShuffledIndex;

                    let btnClass = 'bg-[#FFFDF9] text-[#3B2F2F] border-[#3B2F2F] hover:bg-[#FAF7F0]';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnClass = 'bg-[#D3F9D8] border-[#40C057] text-[#2B8A3E] shadow-[2px_2px_0_#40C057] font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnClass = 'bg-[#FFE3E3] border-[#FA5252] text-[#C92A2A] shadow-[2px_2px_0_#FA5252]';
                      } else {
                        btnClass = 'bg-gray-100 text-[#888888] border-gray-300 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full p-3 rounded-lg border-2 text-left text-xs font-pixel flex items-center justify-between gap-2 transition-all cursor-pointer ${btnClass} shadow-[2px_2px_0_#3B2F2F]`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/80 border border-current flex items-center justify-center text-[10px] shrink-0 font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-body text-xs sm:text-[13px]">{optText}</span>
                        </div>

                        {/* Status Icon */}
                        {isAnswered && (
                          <div className="shrink-0">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-[#40C057]" />
                            ) : isSelected ? (
                              <XCircle className="w-4 h-4 text-[#FA5252]" />
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation and Next Button */}
                {isAnswered && (
                  <div className="pt-2 border-t-2 border-dashed border-[#dcd1be] space-y-3 animate-fadeIn">
                    <div className="bg-[#FAF7F0] border border-[#3B2F2F] rounded p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-pixel font-bold text-[#2E8BFF]">
                          💡 정답 설명
                        </span>
                        {/* Status tag */}
                        {currentRewardStatus === 'rewarded' && (
                          <span className="bg-[#EBFBEE] text-[#2B8A3E] border border-[#B2F2BB] text-[10px] px-1.5 py-0.2 rounded font-pixel font-bold">
                            +5 🌰 적립 완료!
                          </span>
                        )}
                        {currentRewardStatus === 'already_answered' && (
                          <span className="bg-[#F1F3F5] text-[#868E96] border border-[#CED4DA] text-[10px] px-1.5 py-0.2 rounded font-pixel">
                            이미 받은 문제예요
                          </span>
                        )}
                        {currentRewardStatus === 'daily_limit' && (
                          <span className="bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8] text-[10px] px-1.5 py-0.2 rounded font-pixel">
                            오늘 상한(20🌰) 도달
                          </span>
                        )}
                      </div>
                      <p className="font-body text-[#3B2F2F] leading-relaxed">
                        {currentQ.question.explanation}
                      </p>
                    </div>

                    <button
                      onClick={handleNextQuestion}
                      className="w-full retro-btn-blue py-2.5 text-xs font-pixel flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>
                        {currentIndex + 1 === roundQuestions.length ? '결과 보기' : '다음 문제'}
                      </span>
                      <span>›</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Footer Guide Note */}
          <div className="text-center text-[11px] font-pixel text-[#888888] pt-2">
            김재현 ♥ 정하은 커플 퀴즈 · 하루 최대 20 🌰
          </div>
        </div>
      </div>

      {/* ========================================================
          ADMIN QUESTION EDITOR MODAL (Rendered ONLY when isAdmin)
      ======================================================== */}
      {showAdminEditor && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-md w-full p-4 space-y-3 shadow-[6px_6px_0_#2E8BFF] max-h-[90vh] overflow-y-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 text-xs font-pixel font-bold text-[#D9480F]">
                <Edit className="w-4 h-4" />
                <span>커플 퀴즈 질문 관리 (관리자)</span>
              </div>
              <button
                onClick={() => setShowAdminEditor(false)}
                className="text-[#888888] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Information Notice */}
            <div className="bg-[#FAF7F0] p-2.5 rounded border border-[#3B2F2F] text-xs font-pixel space-y-1">
              <div className="flex items-center justify-between">
                <span>현재 등록된 질문: <strong>{allQuestions.length}개</strong></span>
                <span className="text-[#2E8BFF]">한 판 4문제 랜덤 출제</span>
              </div>
              {allQuestions.length < 4 && (
                <div className="text-[#E03131] flex items-center gap-1 text-[11px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>질문을 더 추가해주세요 (한 판 출제에 4개 필요)</span>
                </div>
              )}
            </div>

            {/* Question List */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {allQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-[#FFFDF9] border border-[#3B2F2F] rounded p-2.5 space-y-1.5 text-xs font-pixel shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#3B2F2F]">
                      {idx + 1}. {q.question}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditQuestion(q)}
                        className="retro-btn bg-[#FFF3BF] text-[#D9480F] px-1.5 py-0.5 text-[10px] cursor-pointer"
                        title="수정"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeletingQuestion(q)}
                        className="retro-btn bg-[#FFF0F0] text-[#E03131] px-1.5 py-0.5 text-[10px] cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] font-body text-[#666666]">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`px-1.5 py-0.5 rounded border ${
                          oIdx === q.answerIndex
                            ? 'bg-[#EBFBEE] border-[#40C057] text-[#2B8A3E] font-bold'
                            : 'bg-white border-[#dcd1be]'
                        }`}
                      >
                        {oIdx + 1}. {opt} {oIdx === q.answerIndex && '✓'}
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-[#888888] font-body">
                    설명: {q.explanation}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Add Question Button */}
            <div className="pt-2 border-t border-dashed border-[#dcd1be] flex gap-2">
              <button
                onClick={openAddQuestion}
                className="w-full retro-btn bg-[#2E8BFF] text-white py-2 text-xs font-pixel flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 새 질문 추가하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Form Modal (Add / Edit) */}
      {showQuestionFormModal && isAdmin && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#2E8BFF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <h4 className="font-pixel text-xs font-bold text-[#3B2F2F]">
                {editingQuestion ? '질문 수정' : '새 질문 추가'}
              </h4>
              <button
                onClick={() => setShowQuestionFormModal(false)}
                className="text-[#888888] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-2.5 text-xs font-pixel">
              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">
                  질문 내용 *
                </label>
                <input
                  type="text"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="예: 우리가 처음 만난 날은?"
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  required
                />
              </div>

              {/* 4 Options and Answer Index Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#3B2F2F] block">
                  보기 4개 입력 및 정답 라디오 선택 *
                </label>
                {formOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <label className="cursor-pointer flex items-center">
                      <input
                        type="radio"
                        name="answerIndex"
                        checked={formAnswerIndex === idx}
                        onChange={() => setFormAnswerIndex(idx)}
                        className="cursor-pointer"
                      />
                    </label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...formOptions];
                        next[idx] = e.target.value;
                        setFormOptions(next);
                      }}
                      placeholder={`보기 ${idx + 1}`}
                      className={`flex-1 px-2 py-1 border rounded text-xs ${
                        formAnswerIndex === idx
                          ? 'border-[#40C057] bg-[#F4FBF7] font-bold'
                          : 'border-[#3B2F2F] bg-white'
                      }`}
                      required
                    />
                    {formAnswerIndex === idx && (
                      <span className="text-[10px] text-[#2B8A3E] font-bold shrink-0">
                        정답
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">
                  정답 설명 (한 줄) *
                </label>
                <textarea
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="정답 선택 시 하단에 노출될 설명 문구"
                  rows={2}
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9] resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionFormModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="retro-btn-blue flex-2 py-2 text-xs font-pixel cursor-pointer"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation Modal */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4">
          <div className="retro-box bg-white max-w-xs w-full p-4 space-y-3 text-center shadow-[6px_6px_0_#3B2F2F]">
            <div className="text-3xl">🗑️</div>
            <h4 className="font-pixel text-sm font-bold text-[#3B2F2F]">
              질문을 삭제할까요?
            </h4>
            <p className="text-xs font-body text-[#666666]">
              "{deletingQuestion.question}" 질문이 영구히 삭제됩니다.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingQuestion(null)}
                className="retro-btn flex-1 bg-gray-200 py-2 text-xs font-pixel cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteQuestion}
                className="retro-btn flex-1 bg-[#E03131] text-white py-2 text-xs font-pixel cursor-pointer"
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
