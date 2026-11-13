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
  eligible?: {
    ilchon?: boolean;
    guestbook?: boolean;
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
const LOCAL_PROFILE_KEY_PREFIX = 'cyworld_acorn_profile_v1_';
const LOCAL_EVENT_NAME = 'cyworld-acorn-profile-updated';

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

  private static getLocalKey(uid?: string): string {
    return `${LOCAL_PROFILE_KEY_PREFIX}${uid || 'guest'}`;
  }

  private static readLocalProfile(uid?: string): UserAcornProfile {
    const fallback: UserAcornProfile = {
      acorns: 0,
      claimed: {},
      eligible: {},
      answeredQuestionIds: [],
      quizDaily: { date: this.getTodayString(), earned: 0 },
    };

    try {
      const raw = localStorage.getItem(this.getLocalKey(uid));
      if (!raw) {
        // Also check guest fallback if uid-specific key is empty
        if (uid) {
          const guestRaw = localStorage.getItem(this.getLocalKey(''));
          if (guestRaw) {
            return { ...fallback, ...JSON.parse(guestRaw) };
          }
        }
        return fallback;
      }
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  private static writeLocalProfile(uid: string | undefined, profile: UserAcornProfile): void {
    try {
      const normalized: UserAcornProfile = {
        acorns: profile.acorns || 0,
        claimed: profile.claimed || {},
        eligible: profile.eligible || {},
        answeredQuestionIds: profile.answeredQuestionIds || [],
        quizDaily: profile.quizDaily || { date: this.getTodayString(), earned: 0 },
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
      localStorage.setItem(this.getLocalKey(uid), JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: { uid: uid || 'guest', profile: normalized } }));
    } catch {
      // Ignore storage errors
    }
  }

  private static mergeProfiles(remote: UserAcornProfile, local: UserAcornProfile): UserAcornProfile {
    return {
      acorns: Math.max(remote.acorns || 0, local.acorns || 0),
      claimed: {
        welcome: !!(remote.claimed?.welcome || local.claimed?.welcome),
        guestbook: !!(remote.claimed?.guestbook || local.claimed?.guestbook),
        ilchon: !!(remote.claimed?.ilchon || local.claimed?.ilchon),
      },
      eligible: {
        ilchon: !!(remote.eligible?.ilchon || local.eligible?.ilchon),
        guestbook: !!(remote.eligible?.guestbook || local.eligible?.guestbook),
      },
      answeredQuestionIds: Array.from(
        new Set([...(remote.answeredQuestionIds || []), ...(local.answeredQuestionIds || [])])
      ),
      quizDaily:
        (remote.quizDaily?.date === this.getTodayString() ? remote.quizDaily.earned : 0) >=
        (local.quizDaily?.date === this.getTodayString() ? local.quizDaily.earned : 0)
          ? remote.quizDaily || { date: this.getTodayString(), earned: 0 }
          : local.quizDaily || { date: this.getTodayString(), earned: 0 },
      createdAt: remote.createdAt || local.createdAt,
      updatedAt: remote.updatedAt || local.updatedAt,
    };
  }

  /**
   * Real-time listener for current user's acorn balance and claimed tasks.
   * Works seamlessly with Firestore when authenticated and falls back to local state if auth is unavailable.
   */
  public static subscribeUserAcorns(
    uid: string,
    onData: (data: UserAcornProfile) => void
  ): () => void {
    // Immediately emit local cached state so UI updates without delay
    onData(this.readLocalProfile(uid));

    const handleLocalUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ uid: string; profile: UserAcornProfile }>;
      if (!custom.detail || custom.detail.uid === (uid || 'guest')) {
        onData(this.readLocalProfile(uid));
      }
    };
    window.addEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);

    if (!uid) {
      return () => {
        window.removeEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);
      };
    }

    const docRef = doc(db, USERS_PATH, uid);
    const unsubFirestore = onSnapshot(
      docRef,
      (snapshot) => {
        const local = this.readLocalProfile(uid);
        if (snapshot.exists()) {
          const data = snapshot.data() as UserAcornProfile;
          const remote: UserAcornProfile = {
            acorns: data.acorns || 0,
            claimed: data.claimed || {},
            eligible: data.eligible || {},
            answeredQuestionIds: data.answeredQuestionIds || [],
            quizDaily: data.quizDaily || { date: this.getTodayString(), earned: 0 },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          const merged = this.mergeProfiles(remote, local);
          this.writeLocalProfile(uid, merged);
          onData(merged);
        } else {
          onData(local);
        }
      },
      (error) => {
        // Fallback to local profile if Firestore permissions/auth prevent reading
        console.warn('Firestore user profile read fallback:', error);
        onData(this.readLocalProfile(uid));
      }
    );

    return () => {
      window.removeEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);
      unsubFirestore();
    };
  }

  /**
   * Claim welcome bonus (+5 acorns).
   */
  public static async claimWelcomeReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    const local = this.readLocalProfile(uid);
    if (local.claimed?.welcome) return;

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.WELCOME_REWARD,
        claimed: { ...local.claimed, welcome: true },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.WELCOME_REWARD,
          claimed: {
            welcome: true,
            guestbook: !!local.claimed?.guestbook,
            ilchon: !!local.claimed?.ilchon,
          },
          eligible: {
            ...local.eligible,
          },
          answeredQuestionIds: local.answeredQuestionIds || [],
          quizDaily: local.quizDaily || { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.welcome) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.WELCOME_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.welcome': true,
            updatedAt: new Date().toISOString(),
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), welcome: true },
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
    const local = this.readLocalProfile(uid);
    if (local.claimed?.guestbook) return;

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.GUESTBOOK_REWARD,
        claimed: { ...local.claimed, guestbook: true },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

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
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.guestbook) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.GUESTBOOK_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.guestbook': true,
            updatedAt: new Date().toISOString(),
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), guestbook: true },
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
   * Unlock ilchon reward button after submitting ilchon request (without auto-claiming).
   */
  public static async unlockIlchonReward(uid: string): Promise<void> {
    const local = this.readLocalProfile(uid);
    const nextLocal: UserAcornProfile = {
      ...local,
      eligible: { ...(local.eligible || {}), ilchon: true },
      updatedAt: new Date().toISOString(),
    };
    this.writeLocalProfile(uid, nextLocal);

    if (!uid) return;
    const docRef = doc(db, USERS_PATH, uid);

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: 0,
          claimed: {
            welcome: false,
            guestbook: false,
            ilchon: false,
          },
          eligible: {
            ilchon: true,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.eligible?.ilchon && !data.claimed?.ilchon) {
          await updateDoc(docRef, {
            'eligible.ilchon': true,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.warn('Firestore unlockIlchonReward notice (local state unlocked):', error);
    }
  }

  /**
   * Claim reward on first ilchon request (+10 acorns).
   */
  public static async claimIlchonReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    const local = this.readLocalProfile(uid);
    if (local.claimed?.ilchon) return;

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.ILCHON_REWARD,
        claimed: { ...local.claimed, ilchon: true },
        eligible: { ...local.eligible, ilchon: true },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

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
          eligible: {
            ilchon: true,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.ilchon) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.ILCHON_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.ilchon': true,
            'eligible.ilchon': true,
            updatedAt: new Date().toISOString(),
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), ilchon: true },
            eligible: { ...(data.eligible || {}), ilchon: true },
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
    const today = this.getTodayString();

    if (!uid) {
      const local = this.readLocalProfile('');
      const answeredIds = local.answeredQuestionIds || [];
      if (answeredIds.includes(questionId)) {
        return { rewarded: false, reason: 'already_answered', earnedDelta: 0 };
      }
      const isSameDay = local.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (local.quizDaily?.earned || 0) : 0;
      if (currentDailyEarned >= ACORN_CONFIG.QUIZ_DAILY_MAX) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }
      const earnedDelta = ACORN_CONFIG.QUIZ_REWARD;
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + earnedDelta,
        answeredQuestionIds: [...answeredIds, questionId],
        quizDaily: { date: today, earned: currentDailyEarned + earnedDelta },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile('', updated);
      return { rewarded: true, reason: 'success', earnedDelta };
    }

    const docRef = doc(db, USERS_PATH, uid);
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
        const nextProfile: UserAcornProfile = {
          acorns: newAcorns,
          claimed: {},
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, nextProfile);
        this.writeLocalProfile(uid, nextProfile);
      } else {
        await updateDoc(docRef, {
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
        this.writeLocalProfile(uid, {
          ...profile,
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

  /**
   * Batch reward after completing all 4 quiz questions in a round.
   * Awards +5 acorns per correct answer, capped at QUIZ_DAILY_MAX (20) per day.
   */
  public static async recordQuizRoundReward(
    uid: string,
    correctQuestionIds: string[]
  ): Promise<{ rewarded: boolean; reason?: 'no_correct' | 'daily_limit' | 'success'; earnedDelta: number }> {
    const today = this.getTodayString();
    const correctCount = correctQuestionIds.length;

    if (correctCount === 0) {
      return { rewarded: false, reason: 'no_correct', earnedDelta: 0 };
    }

    if (!uid) {
      const local = this.readLocalProfile('');
      const isSameDay = local.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (local.quizDaily?.earned || 0) : 0;
      const remainingDaily = Math.max(0, ACORN_CONFIG.QUIZ_DAILY_MAX - currentDailyEarned);

      if (remainingDaily <= 0) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }

      const earnedDelta = Math.min(correctCount * ACORN_CONFIG.QUIZ_REWARD, remainingDaily);
      const newAnsweredIds = Array.from(
        new Set([...(local.answeredQuestionIds || []), ...correctQuestionIds])
      );

      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + earnedDelta,
        answeredQuestionIds: newAnsweredIds,
        quizDaily: { date: today, earned: currentDailyEarned + earnedDelta },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile('', updated);
      return { rewarded: true, reason: 'success', earnedDelta };
    }

    const docRef = doc(db, USERS_PATH, uid);
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

      const isSameDay = profile.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (profile.quizDaily?.earned || 0) : 0;
      const remainingDaily = Math.max(0, ACORN_CONFIG.QUIZ_DAILY_MAX - currentDailyEarned);

      if (remainingDaily <= 0) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }

      const earnedDelta = Math.min(correctCount * ACORN_CONFIG.QUIZ_REWARD, remainingDaily);
      const newDailyEarned = currentDailyEarned + earnedDelta;
      const newAcorns = (profile.acorns || 0) + earnedDelta;
      const newAnsweredIds = Array.from(
        new Set([...(profile.answeredQuestionIds || []), ...correctQuestionIds])
      );

      if (!snap.exists()) {
        const nextProfile: UserAcornProfile = {
          acorns: newAcorns,
          claimed: {},
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, nextProfile);
        this.writeLocalProfile(uid, nextProfile);
      } else {
        await updateDoc(docRef, {
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
        this.writeLocalProfile(uid, {
          ...profile,
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
