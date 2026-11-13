import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ACORN_CONFIG } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';

export interface UserAcornProfile {
  acorns: number;
  claimed: {
    welcome?: boolean;
    guestbook?: boolean;
    ilchon?: boolean;
  };
  answeredQuestionIds?: string[];
  quizDaily?: {
    date: string;
    earned: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

const USERS_PATH = 'users';

export class AcornService {
  /**
   * Helper to format current date as YYYY-MM-DD
   */
  public static getTodayString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Real-time listener for current user's acorn balance and claimed tasks.
   */
  public static subscribeUserAcorns(
    uid: string,
    onData: (data: UserAcornProfile) => void
  ): () => void {
    if (!uid) {
      return () => {};
    }

    const docRef = doc(db, USERS_PATH, uid);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserAcornProfile;
          onData({
            acorns: data.acorns || 0,
            claimed: data.claimed || {},
            answeredQuestionIds: data.answeredQuestionIds || [],
            quizDaily: data.quizDaily || { date: this.getTodayString(), earned: 0 },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        } else {
          onData({
            acorns: 0,
            claimed: {},
            answeredQuestionIds: [],
            quizDaily: { date: this.getTodayString(), earned: 0 },
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${USERS_PATH}/${uid}`);
      }
    );
  }

  /**
   * Claim welcome bonus on first entrance (+5 acorns).
   */
  public static async claimWelcomeReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    if (!uid) return;
    const docRef = doc(db, USERS_PATH, uid);

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.WELCOME_REWARD,
          claimed: {
            welcome: true,
            guestbook: false,
            ilchon: false,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.welcome) {
          const currentAcorns = data.acorns || 0;
          await updateDoc(docRef, {
            acorns: currentAcorns + ACORN_CONFIG.WELCOME_REWARD,
            'claimed.welcome': true,
            updatedAt: new Date().toISOString(),
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Claim reward on first guestbook creation (+10 acorns).
   */
  public static async claimGuestbookReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    if (!uid) return;
    const docRef = doc(db, USERS_PATH, uid);

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.GUESTBOOK_REWARD,
          claimed: {
            welcome: false,
            guestbook: true,
            ilchon: false,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.guestbook) {
          const currentAcorns = data.acorns || 0;
          await updateDoc(docRef, {
            acorns: currentAcorns + ACORN_CONFIG.GUESTBOOK_REWARD,
            'claimed.guestbook': true,
            updatedAt: new Date().toISOString(),
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Claim reward on first ilchon request (+10 acorns).
   */
  public static async claimIlchonReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    if (!uid) return;
    const docRef = doc(db, USERS_PATH, uid);

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.ILCHON_REWARD,
          claimed: {
            welcome: false,
            guestbook: false,
            ilchon: true,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.ilchon) {
          const currentAcorns = data.acorns || 0;
          await updateDoc(docRef, {
            acorns: currentAcorns + ACORN_CONFIG.ILCHON_REWARD,
            'claimed.ilchon': true,
            updatedAt: new Date().toISOString(),
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Record correct answer and reward +5 acorns if eligible.
   * Rules:
   * 1. 1 reward (+5) per question ID per user.
   * 2. Daily limit: max 20 acorns per day.
   */
  public static async recordQuizCorrectAnswer(
    uid: string,
    questionId: string
  ): Promise<{ rewarded: boolean; reason?: 'already_answered' | 'daily_limit' | 'success'; earnedDelta: number }> {
    if (!uid) {
      return { rewarded: false, reason: 'already_answered', earnedDelta: 0 };
    }

    const docRef = doc(db, USERS_PATH, uid);
    const today = this.getTodayString();

    try {
      const snap = await getDoc(docRef);
      let profile: UserAcornProfile = {
        acorns: 0,
        claimed: {},
        answeredQuestionIds: [],
        quizDaily: { date: today, earned: 0 },
      };

      if (snap.exists()) {
        profile = snap.data() as UserAcornProfile;
      }

      const answeredIds = profile.answeredQuestionIds || [];
      if (answeredIds.includes(questionId)) {
        return { rewarded: false, reason: 'already_answered', earnedDelta: 0 };
      }

      const isSameDay = profile.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (profile.quizDaily?.earned || 0) : 0;

      if (currentDailyEarned >= ACORN_CONFIG.QUIZ_DAILY_MAX) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }

      const earnedDelta = ACORN_CONFIG.QUIZ_REWARD; // +5
      const newDailyEarned = currentDailyEarned + earnedDelta;
      const newAcorns = (profile.acorns || 0) + earnedDelta;
      const newAnsweredIds = [...answeredIds, questionId];

      if (!snap.exists()) {
        await setDoc(docRef, {
          acorns: newAcorns,
          claimed: {},
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await updateDoc(docRef, {
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
      }

      return { rewarded: true, reason: 'success', earnedDelta };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
      return { rewarded: false, earnedDelta: 0 };
    }
  }
}
